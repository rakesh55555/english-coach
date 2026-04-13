$body = @{
    input = 'I am happy'
    userId = 'gf_1'
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:5000/api/ai' `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body `
    -UseBasicParsing

Write-Host "Status: 200 OK"
Write-Host ""
Write-Host "Response:"
$response.Content | ConvertFrom-Json | ConvertTo-Json
