$response = Invoke-WebRequest -Uri 'http://localhost:5000/api/progress/gf_1' `
    -UseBasicParsing

Write-Host "Status: Success"
Write-Host ""
Write-Host "Response:"
$response.Content | ConvertFrom-Json | ConvertTo-Json
