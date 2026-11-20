param(
  [switch]$ConfigureOnly,
  [switch]$CheckOnly,
  [switch]$Disable,
  [int]$InterfaceIndex = 0,
  [ValidateRange(1024, 65535)][int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$ruleName = "FieldIQ-LAN-TCP-$Port"
$projectDirectory = Split-Path $PSScriptRoot -Parent

function Assert-Administrator {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute INICIAR-FIELDIQ-REDE.cmd como administrador para configurar o firewall na primeira vez.'
  }
}

try {
  if ($Disable) {
    Assert-Administrator
    Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Disable-NetFirewallRule
    Write-Host 'Regra do FieldIQ desativada. Feche tambem a janela do servidor para encerrar o acesso.'
    exit 0
  }

  $connections = @(Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' -and
    ($InterfaceIndex -eq 0 -or $_.InterfaceIndex -eq $InterfaceIndex)
  })
  if ($connections.Count -ne 1) {
    throw 'Nao foi possivel selecionar uma unica rede. Use -InterfaceIndex com o indice da conexao desejada (Get-NetIPConfiguration).'
  }
  $connection = $connections[0]
  $addresses = @($connection.IPv4Address | Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' })
  if ($addresses.Count -ne 1) { throw 'A conexao precisa ter um unico endereco IPv4 ativo.' }
  $lanAddress = $addresses[0].IPAddress
  $prefixLength = [int]$addresses[0].PrefixLength
  $bytes = [System.Net.IPAddress]::Parse($lanAddress).GetAddressBytes()
  $maskBytes = @(0, 0, 0, 0)
  for ($index = 0; $index -lt 4; $index++) {
    $bits = [Math]::Max(0, [Math]::Min(8, $prefixLength - 8 * $index))
    $mask = if ($bits -eq 0) { 0 } else { (255 -shl (8 - $bits)) -band 255 }
    $maskBytes[$index] = $mask
    $bytes[$index] = $bytes[$index] -band $mask
  }
  $subnet = ($bytes -join '.') + '/' + $prefixLength
  $firewallSubnet = ($bytes -join '.') + '/' + ($maskBytes -join '.')
  $profile = (Get-NetConnectionProfile -InterfaceIndex $connection.InterfaceIndex).NetworkCategory.ToString()
  if ($profile -eq 'DomainAuthenticated') { $profile = 'Domain' }
  $nodeExecutable = (Get-Command node.exe).Source
  $url = "http://${lanAddress}:$Port"
  Write-Host "Rede: $($connection.InterfaceAlias) | Endereco: $url | Sub-rede: $subnet"
  Write-Host "Portal do cliente: $url/cliente.html"
  if ($CheckOnly) { exit 0 }

  $existingRule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
  $matches = $false
  if ($existingRule) {
    $addressFilter = $existingRule | Get-NetFirewallAddressFilter
    $portFilter = $existingRule | Get-NetFirewallPortFilter
    $applicationFilter = $existingRule | Get-NetFirewallApplicationFilter
    $interfaceFilter = $existingRule | Get-NetFirewallInterfaceFilter
    $matches = ($existingRule.Enabled -eq 'True' -and $existingRule.Direction -eq 'Inbound' -and
      $existingRule.Action -eq 'Allow' -and $existingRule.Profile.ToString() -eq $profile -and
      $existingRule.EdgeTraversalPolicy -eq 'Block' -and
      (@($addressFilter.LocalAddress) -join ',') -eq $lanAddress -and
      (@($addressFilter.RemoteAddress) -join ',') -in @($subnet, $firewallSubnet) -and
      $portFilter.Protocol -eq 'TCP' -and $portFilter.LocalPort -eq $Port -and
      $portFilter.RemotePort -eq 'Any' -and $applicationFilter.Program -eq $nodeExecutable -and
      (@($interfaceFilter.InterfaceAlias) -join ',') -eq $connection.InterfaceAlias)
  }
  if (-not $matches) {
    Assert-Administrator
    $firewallSettings = @{
      Profile = $profile; Direction = 'Inbound'; Action = 'Allow'; Enabled = 'True'
      Protocol = 'TCP'; LocalPort = $Port; RemotePort = 'Any'; Program = $nodeExecutable
      LocalAddress = $lanAddress; RemoteAddress = $subnet; InterfaceAlias = $connection.InterfaceAlias
      EdgeTraversalPolicy = 'Block'
    }
    if ($existingRule) {
      Set-NetFirewallRule -Name $ruleName @firewallSettings
    } else {
      New-NetFirewallRule -Name $ruleName -DisplayName "FieldIQ - rede local TCP $Port" @firewallSettings | Out-Null
    }
  }
  Write-Host "Firewall configurado somente para $subnet nesta conexao."
  if ($ConfigureOnly) { exit 0 }

  $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
  if (@($listeners | Where-Object Port -eq $Port).Count -gt 0) {
    throw "A porta $Port ja esta em uso. Feche a janela do servidor atual (Ctrl+C) e abra novamente INICIAR-FIELDIQ-REDE.cmd."
  }
  Push-Location $projectDirectory
  try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
      & npm.cmd ci
      if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependencias.' }
    }
    $previousHost = $env:HOST
    $previousPort = $env:PORT
    try {
      $env:HOST = $lanAddress
      $env:PORT = "$Port"
      Write-Host "Abra $url nos aparelhos da mesma rede. Mantenha esta janela aberta."
      & $nodeExecutable --env-file-if-exists=.env server/index.mjs
      if ($LASTEXITCODE -ne 0) { throw "O servidor encerrou com codigo $LASTEXITCODE." }
    } finally {
      $env:HOST = $previousHost
      $env:PORT = $previousPort
    }
  } finally { Pop-Location }
} catch {
  Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
