const { 
  Vault, 
  SubSchedule, 
  Beneficiary, 
  Organization,
  Token,
  ClaimsHistory
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../database/connection');

const cacheService = require('./cacheService');

/**
 * Cap Table Service for generating real-time Web3 Cap Table
 * Groups all individual vesting schedules by user/entity and calculates ownership percentages
 */
class CapTableService {
  /**
   * Generate comprehensive cap table for a token
   * @param {string} tokenAddress - Token address to generate cap table for
   * @param {Object} options - Additional options
   * @returns {Object} Cap table data with ownership breakdown
   */
  async generateCapTable(tokenAddress, options = {}) {
    const { includeInactive = false, organizationId = null, asOfDate = new Date() } = options;
    
    // Only cache if asOfDate is roughly "now" (default)
    const isNow = !options.asOfDate || Math.abs(new Date(asOfDate) - new Date()) < 60000;
    
    if (isNow && !includeInactive) {
      const cacheKey = `cap_table:${tokenAddress}${organizationId ? `:${organizationId}` : ''}`;
      return await cacheService.wrapWithCache(cacheKey, async () => {
        return this._generateCapTableInternal(tokenAddress, options);
      }, 900); // 15 minutes TTL
    }

    return this._generateCapTableInternal(tokenAddress, options);
  }

  async _generateCapTableInternal(tokenAddress, options = {}) {
    const { includeInactive = false, organizationId = null, asOfDate = new Date() } = options;
    
    // Get all vaults for this token
    const vaults = await this.getTokenVaults(tokenAddress, organizationId, includeInactive);
    
    if (vaults.length === 0) {
      return this.createEmptyCapTable(tokenAddress);
    }

    // Get all beneficiaries and their schedules
    const beneficiaryHoldings = await this.calculateBeneficiaryHoldings(vaults, asOfDate);
    
    // Calculate total token supply (allocated + unallocated)
    const totalSupply = await this.calculateTotalTokenSupply(tokenAddress, vaults);
    
    // Calculate ownership percentages
    const ownershipBreakdown = this.calculateOwnershipPercentages(beneficiaryHoldings, totalSupply);
    
    // Group by organization if needed
    const organizationBreakdown = await this.groupByOrganization(beneficiaryHoldings, vaults);
    
    // Generate summary statistics
    const summary = this.generateCapTableSummary(beneficiaryHoldings, totalSupply, vaults);

    return {
      tokenAddress,
      tokenInfo: await this.getTokenInfo(tokenAddress),
      asOfDate,
      totalSupply: totalSupply.toString(),
      totalAllocated: summary.totalAllocated.toString(),
      totalUnallocated: summary.totalUnallocated.toString(),
      totalBeneficiaries: beneficiaryHoldings.length,
      totalVaults: vaults.length,
      beneficiaryHoldings: ownershipBreakdown,
      organizationBreakdown,
      summary,
      generatedAt: new Date()
    };
  }

  async getOrganizationCapTable(organizationId, tokenAddress = null, options = {}) {
    const { asOfDate = new Date() } = options;
    
    // Only cache if asOfDate is roughly "now" (default)
    const isNow = !options.asOfDate || Math.abs(new Date(asOfDate) - new Date()) < 60000;

    if (isNow) {
      const cacheKey = `org_cap_table:${organizationId}${tokenAddress ? `:${tokenAddress}` : ''}`;
      return await cacheService.wrapWithCache(cacheKey, async () => {
        return this._getOrganizationCapTableInternal(organizationId, tokenAddress, options);
      }, 900); // 15 minutes TTL
    }

    return this._getOrganizationCapTableInternal(organizationId, tokenAddress, options);
  }

  async _getOrganizationCapTableInternal(organizationId, tokenAddress = null, options = {}) {
    const { asOfDate = new Date() } = options;
    
    const whereClause = { org_id: organizationId };
    if (tokenAddress) {
      whereClause.token_address = tokenAddress;
    }

    const vaults = await Vault.findAll({
      where: whereClause,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'admin_address']
        },
        {
          model: Token,
          as: 'token',
          attributes: ['address', 'symbol', 'name', 'decimals']
        }
      ]
    });

    if (vaults.length === 0) {
      return {
        organizationId,
        organization: await Organization.findByPk(organizationId),
        ...this.createEmptyCapTable(tokenAddress)
      };
    }

    // Group vaults by token if multiple tokens
    const tokenGroups = this.groupVaultsByToken(vaults);
    const capTableResults = [];

    for (const [tokenAddr, tokenVaults] of Object.entries(tokenGroups)) {
      const beneficiaryHoldings = await this.calculateBeneficiaryHoldings(tokenVaults, asOfDate);
      const totalSupply = await this.calculateTotalTokenSupply(tokenAddr, tokenVaults);
      const ownershipBreakdown = this.calculateOwnershipPercentages(beneficiaryHoldings, totalSupply);
      const summary = this.generateCapTableSummary(beneficiaryHoldings, totalSupply, tokenVaults);

      capTableResults.push({
        tokenAddress: tokenAddr,
        tokenInfo: await this.getTokenInfo(tokenAddr),
        totalSupply: totalSupply.toString(),
        beneficiaryHoldings: ownershipBreakdown,
        summary
      });
    }

    return {
      organizationId,
      organization: vaults[0]?.organization || await Organization.findByPk(organizationId),
      tokens: capTableResults,
      generatedAt: new Date()
    };
  }

  /**
   * Get individual beneficiary's cap table position
   */
  async getBeneficiaryPosition(beneficiaryAddress, tokenAddress = null) {
    const whereClause = { address: beneficiaryAddress };
    
    const beneficiaries = await Beneficiary.findAll({
      where: whereClause,
      include: [
        {
          model: Vault,
          as: 'vault',
          where: tokenAddress ? { token_address: tokenAddress } : {},
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name']
            },
            {
              model: Token,
              as: 'token',
              attributes: ['address', 'symbol', 'name', 'decimals']
            }
          ]
        }
      ]
    });

    if (beneficiaries.length === 0) {
      return {
        beneficiaryAddress,
        holdings: [],
        totalAllocated: '0',
        totalVested: '0',
        totalWithdrawn: '0'
      };
    }

    const holdings = [];
    let totalAllocated = 0;
    let totalVested = 0;
    let totalWithdrawn = 0;

    for (const beneficiary of beneficiaries) {
      const vault = beneficiary.vault;
      const schedules = await SubSchedule.findAll({
        where: { vault_id: vault.id, is_active: true },
        include: [
          {
            model: ClaimsHistory,
            as: 'claims',
            where: { user_address: beneficiaryAddress },
            required: false
          }
        ]
      });

      const vaultHolding = await this.calculateVaultHolding(vault, beneficiary, schedules);
      holdings.push(vaultHolding);
      
      totalAllocated += parseFloat(vaultHolding.totalAllocated);
      totalVested += parseFloat(vaultHolding.vestedAmount);
      totalWithdrawn += parseFloat(vaultHolding.totalWithdrawn);
    }

    return {
      beneficiaryAddress,
      holdings,
      totalAllocated: totalAllocated.toString(),
      totalVested: totalVested.toString(),
      totalWithdrawn: totalWithdrawn.toString(),
      totalWithdrawable: (totalVested - totalWithdrawn).toString(),
      generatedAt: new Date()
    };
  }

  /**
   * Get all vaults for a specific token
   */
  async getTokenVaults(tokenAddress, organizationId = null, includeInactive = false) {
    const whereClause = { token_address: tokenAddress };
    
    if (organizationId) {
      whereClause.org_id = organizationId;
    }
    
    if (!includeInactive) {
      whereClause.is_active = true;
    }

    return await Vault.findAll({
      where: whereClause,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'admin_address']
        },
        {
          model: Token,
          as: 'token',
          attributes: ['address', 'symbol', 'name', 'decimals']
        }
      ]
    });
  }

  /**
   * Calculate holdings for all beneficiaries across given vaults
   */
  async calculateBeneficiaryHoldings(vaults, asOfDate) {
    const holdings = new Map();

    for (const vault of vaults) {
      // Get all beneficiaries for this vault
      const beneficiaries = await Beneficiary.findAll({
        where: { vault_id: vault.id },
        include: [
          {
            model: Vault,
            as: 'vault',
            include: [
              {
                model: SubSchedule,
                as: 'subSchedules',
                where: { is_active: true },
                include: [
                  {
                    model: ClaimsHistory,
                    as: 'claims',
                    required: false
                  }
                ]
              }
            ]
          }
        ]
      });

      for (const beneficiary of beneficiaries) {
        const address = beneficiary.address;
        
        if (!holdings.has(address)) {
          holdings.set(address, {
            beneficiaryAddress: address,
            email: beneficiary.email,
            holdings: [],
            totalAllocated: 0,
            totalVested: 0,
            totalWithdrawn: 0,
            organizations: new Set()
          });
        }

        const holding = holdings.get(address);
        const vaultHolding = await this.calculateVaultHolding(
          beneficiary.vault, 
          beneficiary, 
          beneficiary.vault.subSchedules, 
          asOfDate
        );

        holding.holdings.push(vaultHolding);
        holding.totalAllocated += parseFloat(vaultHolding.totalAllocated);
        holding.totalVested += parseFloat(vaultHolding.vestedAmount);
        holding.totalWithdrawn += parseFloat(vaultHolding.totalWithdrawn);
        
        if (vaultHolding.organization) {
          holding.organizations.add(vaultHolding.organization);
        }
      }
    }

    // Convert Map to array and format
    return Array.from(holdings.values()).map(holding => ({
      ...holding,
      organizations: Array.from(holding.organizations),
      totalAllocated: holding.totalAllocated.toString(),
      totalVested: holding.totalVested.toString(),
      totalWithdrawn: holding.totalWithdrawn.toString(),
      totalWithdrawable: (holding.totalVested - holding.totalWithdrawn).toString()
    }));
  }

  /**
   * Calculate holding for a specific vault
   */
  async calculateVaultHolding(vault, beneficiary, schedules, asOfDate = new Date()) {
    let totalAllocated = 0;
    let vestedAmount = 0;
    let totalWithdrawn = 0;
    let withdrawableAmount = 0;

    for (const schedule of schedules) {
      totalAllocated += parseFloat(schedule.top_up_amount);
      totalWithdrawn += parseFloat(schedule.amount_withdrawn);

      // Calculate vested amount as of asOfDate
      const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= asOfDate;
      if (isCliffPassed) {
        const timePassed = Math.max(0, asOfDate - schedule.vesting_start_date);
        const totalVestingTime = schedule.vesting_duration * 1000;
        const progress = Math.min(1, timePassed / totalVestingTime);
        vestedAmount += parseFloat(schedule.top_up_amount) * progress;
      }
    }

    withdrawableAmount = Math.max(0, vestedAmount - totalWithdrawn);

    return {
      vaultAddress: vault.address,
      vaultName: vault.name,
      tokenAddress: vault.token_address,
      tokenSymbol: vault.token?.symbol,
      organization: vault.organization?.name,
      organizationId: vault.org_id,
      totalAllocated: totalAllocated.toString(),
      vestedAmount: vestedAmount.toString(),
      totalWithdrawn: totalWithdrawn.toString(),
      withdrawableAmount: withdrawableAmount.toString(),
      vestingProgress: totalAllocated > 0 ? vestedAmount / totalAllocated : 0,
      isFullyVested: vestedAmount >= totalAllocated,
      scheduleCount: schedules.length,
      activeSchedules: schedules.filter(s => s.is_active).length
    };
  }

  /**
   * Calculate total token supply (allocated + unallocated)
   */
  async calculateTotalTokenSupply(tokenAddress, vaults) {
    // Sum all vault amounts for this token
    const vaultTotal = vaults.reduce((sum, vault) => {
      return sum + parseFloat(vault.total_amount || 0);
    }, 0);

    // Add any additional token supply from external sources if needed
    // For now, we'll use the vault total as the supply
    return vaultTotal;
  }

  /**
   * Calculate ownership percentages for all beneficiaries
   */
  calculateOwnershipPercentages(beneficiaryHoldings, totalSupply) {
    return beneficiaryHoldings
      .map(holding => ({
        ...holding,
        ownershipPercentage: totalSupply > 0 ? (holding.totalVested / totalSupply) * 100 : 0,
        fullyDilutedOwnership: totalSupply > 0 ? (holding.totalAllocated / totalSupply) * 100 : 0
      }))
      .sort((a, b) => b.fullyDilutedOwnership - a.fullyDilutedOwnership);
  }

  /**
   * Group holdings by organization
   */
  async groupByOrganization(beneficiaryHoldings, vaults) {
    const orgGroups = new Map();

    for (const holding of beneficiaryHoldings) {
      for (const orgName of holding.organizations) {
        if (!orgGroups.has(orgName)) {
          orgGroups.set(orgName, {
            organizationName: orgName,
            beneficiaries: [],
            totalAllocated: 0,
            totalVested: 0,
            totalWithdrawn: 0
          });
        }

        const orgGroup = orgGroups.get(orgName);
        orgGroup.beneficiaries.push({
          beneficiaryAddress: holding.beneficiaryAddress,
          totalAllocated: holding.totalAllocated,
          totalVested: holding.totalVested,
          totalWithdrawn: holding.totalWithdrawn
        });

        orgGroup.totalAllocated += parseFloat(holding.totalAllocated);
        orgGroup.totalVested += parseFloat(holding.totalVested);
        orgGroup.totalWithdrawn += parseFloat(holding.totalWithdrawn);
      }
    }

    return Array.from(orgGroups.values()).map(org => ({
      ...org,
      totalAllocated: org.totalAllocated.toString(),
      totalVested: org.totalVested.toString(),
      totalWithdrawn: org.totalWithdrawn.toString(),
      beneficiaryCount: org.beneficiaries.length
    }));
  }

  /**
   * Generate cap table summary statistics
   */
  generateCapTableSummary(beneficiaryHoldings, totalSupply, vaults) {
    const totalAllocated = beneficiaryHoldings.reduce((sum, h) => sum + parseFloat(h.totalAllocated), 0);
    const totalVested = beneficiaryHoldings.reduce((sum, h) => sum + parseFloat(h.totalVested), 0);
    const totalWithdrawn = beneficiaryHoldings.reduce((sum, h) => sum + parseFloat(h.totalWithdrawn), 0);
    const totalUnallocated = parseFloat(totalSupply) - totalAllocated;

    // Calculate concentration metrics
    const sortedHoldings = beneficiaryHoldings.sort((a, b) => 
      parseFloat(b.totalVested) - parseFloat(a.totalVested)
    );
    
    const topHolders = sortedHoldings.slice(0, 10);
    const topHolderPercentage = totalVested > 0 ? 
      (parseFloat(topHolders[0]?.totalVested || 0) / totalVested) * 100 : 0;
    
    const top10Percentage = totalVested > 0 ? 
      (topHolders.reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / totalVested) * 100 : 0;

    return {
      totalAllocated: totalAllocated.toString(),
      totalVested: totalVested.toString(),
      totalWithdrawn: totalWithdrawn.toString(),
      totalUnallocated: totalUnallocated.toString(),
      vestingProgress: totalAllocated > 0 ? totalVested / totalAllocated : 0,
      averageHoldingPerBeneficiary: beneficiaryHoldings.length > 0 ? 
        totalAllocated / beneficiaryHoldings.length : 0,
      topHolderPercentage,
      top10Percentage,
      activeVaults: vaults.filter(v => v.is_active).length,
      totalVaults: vaults.length
    };
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress) {
    const token = await Token.findOne({
      where: { address: tokenAddress }
    });

    return token ? {
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals
    } : {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18
    };
  }

  /**
   * Create empty cap table structure
   */
  createEmptyCapTable(tokenAddress) {
    return {
      tokenAddress,
      totalSupply: '0',
      totalAllocated: '0',
      totalUnallocated: '0',
      totalBeneficiaries: 0,
      totalVaults: 0,
      beneficiaryHoldings: [],
      organizationBreakdown: [],
      summary: {
        totalAllocated: '0',
        totalVested: '0',
        totalWithdrawn: '0',
        totalUnallocated: '0',
        vestingProgress: 0,
        averageHoldingPerBeneficiary: 0,
        topHolderPercentage: 0,
        top10Percentage: 0,
        activeVaults: 0,
        totalVaults: 0
      },
      generatedAt: new Date()
    };
  }

  /**
   * Group vaults by token address
   */
  groupVaultsByToken(vaults) {
    return vaults.reduce((groups, vault) => {
      const tokenAddr = vault.token_address;
      if (!groups[tokenAddr]) {
        groups[tokenAddr] = [];
      }
      groups[tokenAddr].push(vault);
      return groups;
    }, {});
  }

  /**
   * Get cap table analytics
   */
  async getCapTableAnalytics(tokenAddress, period = '30d', organizationId = null) {
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const days = periodMap[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get historical data for the period
    const dailyData = await this.generateDailyAnalytics(tokenAddress, startDate, endDate, organizationId);
    
    // Calculate period metrics
    const totalNewAllocations = dailyData.reduce((sum, day) => sum + parseFloat(day.newAllocations), 0);
    const totalClaims = dailyData.reduce((sum, day) => sum + day.claimsCount, 0);
    const totalClaimedAmount = dailyData.reduce((sum, day) => sum + parseFloat(day.claimedAmount), 0);
    const averageClaimAmount = totalClaims > 0 ? totalClaimedAmount / totalClaims : 0;

    const newBeneficiaries = await this.getNewBeneficiariesCount(tokenAddress, startDate, endDate, organizationId);
    
    return {
      tokenAddress,
      period,
      startDate,
      endDate,
      newBeneficiaries,
      totalNewAllocations: totalNewAllocations.toString(),
      vestingProgressChange: 0, // TODO: Calculate progress change
      concentrationChange: 0, // TODO: Calculate concentration change
      topHolderChange: 0, // TODO: Calculate top holder change
      totalClaims,
      totalClaimedAmount: totalClaimedAmount.toString(),
      averageClaimAmount: averageClaimAmount.toString(),
      dailyData
    };
    }

  /**
   * Search beneficiaries in cap table
   */
  async searchBeneficiaries(tokenAddress, query, options = {}) {
    const { first = 50 } = options;
    const searchQuery = `%${query}%`;
    
    const capTable = await this.generateCapTable(tokenAddress, { includeInactive: false });
    
    const filtered = capTable.beneficiaryHoldings.filter(holding => 
      holding.beneficiaryAddress.toLowerCase().includes(query.toLowerCase()) ||
      (holding.email && holding.email.toLowerCase().includes(query.toLowerCase())) ||
      holding.organizations.some(org => org.toLowerCase().includes(query.toLowerCase()))
    );

    return filtered.slice(0, first);
    }

  /**
   * Get concentration metrics
   */
  async getConcentrationMetrics(tokenAddress, organizationId = null) {
    const capTable = await this.generateCapTable(tokenAddress, { organizationId });
    const holdings = capTable.beneficiaryHoldings;
    
    if (holdings.length === 0) {
      return {
        tokenAddress,
        totalBeneficiaries: 0,
        top1Percentage: 0,
        top5Percentage: 0,
        top10Percentage: 0,
        top20Percentage: 0,
        giniCoefficient: 0,
        hhi: 0,
        decileBreakdown: [],
        calculatedAt: new Date()
      };
    }

    const totalVested = parseFloat(capTable.summary.totalVested);
    const sortedHoldings = holdings.sort((a, b) => 
      parseFloat(b.totalVested) - parseFloat(a.totalVested)
    );

    // Calculate top holder percentages
    const top1 = parseFloat(sortedHoldings[0]?.totalVested || 0) / totalVested * 100;
    const top5 = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / totalVested * 100;
    const top10 = sortedHoldings.slice(0, 10).reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / totalVested * 100;
    const top20 = sortedHoldings.slice(0, 20).reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / totalVested * 100;

    // Calculate Gini coefficient
    const giniCoefficient = this.calculateGiniCoefficient(holdings.map(h => parseFloat(h.totalVested)));
    
    // Calculate HHI (Herfindahl-Hirschman Index)
    const hhi = this.calculateHHI(holdings.map(h => parseFloat(h.totalVested) / totalVested * 100));
    
    // Calculate decile breakdown
    const decileBreakdown = this.calculateDecileBreakdown(holdings, totalVested);

    return {
      tokenAddress,
      totalBeneficiaries: holdings.length,
      top1Percentage: top1,
      top5Percentage: top5,
      top10Percentage: top10,
      top20Percentage: top20,
      giniCoefficient,
      hhi,
      decileBreakdown,
      calculatedAt: new Date()
    };
    }

  /**
   * Export cap table to CSV/Excel
   */
  async exportCapTable(capTable, format = 'csv') {
    // This would generate a file and return a download URL
    // For now, return a placeholder URL
    const timestamp = new Date().toISOString();
    return `/api/exports/cap-table-${capTable.tokenAddress}-${timestamp}.${format}`;
    }

  /**
   * Generate cap table report
   */
  async generateReport(capTable, reportType) {
    // This would generate a PDF report and return a URL
    // For now, return a placeholder URL
    const timestamp = new Date().toISOString();
    return `/api/reports/cap-table-${capTable.tokenAddress}-${reportType}-${timestamp}.pdf`;
    }

  /**
   * Helper methods
   */
  async generateDailyAnalytics(tokenAddress, startDate, endDate, organizationId) {
    const dailyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // This would query historical data for each day
      // For now, return placeholder data
      dailyData.push({
        date: new Date(currentDate),
        totalBeneficiaries: 0,
        totalAllocated: '0',
        totalVested: '0',
        newAllocations: '0',
        claimsCount: 0,
        claimedAmount: '0'
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dailyData;
    }

  async getNewBeneficiariesCount(tokenAddress, startDate, endDate, organizationId) {
    // This would count beneficiaries created in the date range
    // For now, return 0
    return 0;
    }

  calculateGiniCoefficient(values) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    const totalSum = sorted.reduce((a, b) => a + b, 0);
    return totalSum === 0 ? 0 : sum / (n * totalSum);
    }

  calculateHHI(percentages) {
    return percentages.reduce((sum, pct) => sum + pct * pct, 0);
    }

  calculateDecileBreakdown(holdings, totalVested) {
    const decileSize = Math.ceil(holdings.length / 10);
    const deciles = [];
    
    for (let i = 0; i < 10; i++) {
      const start = i * decileSize;
      const end = Math.min((i + 1) * decileSize, holdings.length);
      const decileHoldings = holdings.slice(start, end);
      
      if (decileHoldings.length > 0) {
        const totalOwnership = decileHoldings.reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / totalVested * 100;
        const averageHolding = decileHoldings.reduce((sum, h) => sum + parseFloat(h.totalVested), 0) / decileHoldings.length;
        
        deciles.push({
          decile: i + 1,
          beneficiaryCount: decileHoldings.length,
          totalOwnership,
          averageHolding: averageHolding.toString()
        });
      }
    }
    
    return deciles;
  }
}

module.exports = new CapTableService();
