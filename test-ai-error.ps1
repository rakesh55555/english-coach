$body = @{
    input = 'hello'
    userId = 'gf_1'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/ai' `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "Error Response:"
    Write-Host ($_.Exception.Response.StatusCode)
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    $errorResponse | ConvertTo-Json
}
