# Read the PR description
$description = Get-Content -Path "pr_description.md" -Raw

# Create the JSON payload
$body = @{
    title = "feat: Implement SEC/FINRA Rule 144 Compliance Monitor (#129 #72)"
    head = "feature/rule144-compliance-monitor"
    base = "main"
    body = $description
} | ConvertTo-Json -Depth 10

Write-Host "Creating Pull Request..."
Write-Host "Repository: Ardecrownn/backend"
Write-Host "Head: feature/rule144-compliance-monitor"
Write-Host "Base: main"

# Note: You'll need to set your GitHub token as an environment variable
# $env:GITHUB_TOKEN = "your_github_token_here"

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/Ardecrownn/backend/pulls" -Method Post -Headers @{
        "Authorization" = "token $env:GITHUB_TOKEN"
        "Accept" = "application/vnd.github.v3+json"
    } -Body $body -ContentType "application/json"
    
    Write-Host "Pull Request created successfully!"
    Write-Host "PR URL: $($response.html_url)"
    Write-Host "PR Number: #$($response.number)"
} catch {
    Write-Host "Error creating PR: $($_.Exception.Message)"
    Write-Host "Make sure your GITHUB_TOKEN environment variable is set"
    Write-Host "You can also create the PR manually at: https://github.com/Ardecrownn/backend/pull/new/feature/rule144-compliance-monitor"
}
