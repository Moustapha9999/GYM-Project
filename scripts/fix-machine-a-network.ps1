# Fixe l'IP Wi-Fi de la machine A et ouvre le pare-feu pour les postes B/C
# EXECUTER EN POWERSHELL ADMINISTRATEUR
#
# Usage :
#   powershell -ExecutionPolicy Bypass -File scripts\fix-machine-a-network.ps1

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfFile = Join-Path $ProjectRoot 'scripts\machine-a-ip.conf'
$TargetIp = '192.168.100.6'
$Gateway = '192.168.100.1'
$Prefix = 24
$Dns = @('192.168.100.1')
$WifiAlias = 'Wi-Fi'

if (Test-Path $ConfFile) {
    Get-Content $ConfFile | ForEach-Object {
        if ($_ -match '^MACHINE_A_IP=(.+)$') {
            $TargetIp = $Matches[1].Trim()
        }
    }
}

Write-Host '==========================================' -ForegroundColor Green
Write-Host "  Fix reseau Machine A -> $TargetIp" -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Write-Host ''

$wifi = Get-NetAdapter -Name $WifiAlias -ErrorAction SilentlyContinue
if (-not $wifi) {
    Write-Host "ERREUR: Interface '$WifiAlias' introuvable." -ForegroundColor Red
    exit 1
}

if ($wifi.Status -ne 'Up') {
    Write-Host 'ERREUR: Wi-Fi non connecte. Connectez-vous au reseau local.' -ForegroundColor Red
    exit 1
}

Write-Host "Interface Wi-Fi : $($wifi.Status)" -ForegroundColor Cyan
Write-Host "Configuration IP statique $TargetIp sur Wi-Fi..." -ForegroundColor Cyan

Get-NetIPAddress -InterfaceAlias $WifiAlias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    ForEach-Object {
        Remove-NetIPAddress -InterfaceAlias $WifiAlias -Confirm:$false -ErrorAction SilentlyContinue
    }

Set-NetIPInterface -InterfaceAlias $WifiAlias -Dhcp Disabled -ErrorAction SilentlyContinue
New-NetIPAddress -InterfaceAlias $WifiAlias -IPAddress $TargetIp -PrefixLength $Prefix -DefaultGateway $Gateway -ErrorAction Stop | Out-Null
Set-DnsClientServerAddress -InterfaceAlias $WifiAlias -ServerAddresses $Dns -ErrorAction SilentlyContinue

Write-Host "OK: IP statique $TargetIp" -ForegroundColor Green

$ruleName = 'GYM SYLLA PostgreSQL 5432'
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName `
        -Description 'PostgreSQL partage pour postes B/C GYM SYLLA' `
        -Direction Inbound -Protocol TCP -LocalPort 5432 `
        -Action Allow -Profile Private,Domain | Out-Null
    Write-Host 'OK: Pare-feu port 5432 ouvert' -ForegroundColor Green
} else {
    Write-Host 'OK: Regle pare-feu 5432 deja presente' -ForegroundColor Green
}

$ruleNotif = 'GYM SYLLA Notifications 3001'
if (-not (Get-NetFirewallRule -DisplayName $ruleNotif -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleNotif `
        -Description 'Service WhatsApp GYM SYLLA' `
        -Direction Inbound -Protocol TCP -LocalPort 3001 `
        -Action Allow -Profile Private,Domain | Out-Null
    Write-Host 'OK: Pare-feu port 3001 ouvert' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Verification...' -ForegroundColor Cyan
$currentIp = (Get-NetIPAddress -InterfaceAlias $WifiAlias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like '192.168.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ''
Write-Host '==========================================' -ForegroundColor Green
Write-Host '  Resultat' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Write-Host "  IP machine A : $currentIp"
Write-Host "  IP attendue  : $TargetIp"
Write-Host "  Passerelle   : $Gateway"
Write-Host ''
Write-Host '  Sur machines B/C :'
Write-Host '    ./scripts/start-workstation-b-c.sh'
Write-Host '    Navigateur : http://localhost:4200'
Write-Host ''
Write-Host "  Test depuis B/C :"
Write-Host "    Test-NetConnection -ComputerName $TargetIp -Port 5432"
Write-Host '==========================================' -ForegroundColor Green

if ($currentIp -ne $TargetIp) {
    Write-Host "ATTENTION: IP actuelle ($currentIp) != cible ($TargetIp)" -ForegroundColor Yellow
    exit 1
}

Write-Host 'OK: Machine A prete pour les postes B/C' -ForegroundColor Green
