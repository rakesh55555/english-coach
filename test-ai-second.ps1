$body = @{
    input = 'I are happy'
    userId = 'gf_1'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/ai' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "✅ Success!"
    Write-Host ""
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "❌ Error:"
    Write-Host ($_.ErrorDetails.Message)
}
