# RN dev setup - herdr desktop launcher
# Creates one shortcut to herdr carrying its own icon. Nothing else is touched.
# Run it straight from the page:
#   & ([scriptblock]::Create((irm https://rn-dev-onboarding.pages.dev/herdr-launcher.ps1))) -Dest 'C:\...'
param(
  [string]$Dest,
  [string]$IconFile,
  [string]$IconUrl = 'https://rn-dev-onboarding.pages.dev/herdr.ico'
)

$ErrorActionPreference = 'Stop'

$exe = (Get-Command herdr -ErrorAction SilentlyContinue).Source
if (-not $exe) {
  Write-Host 'herdr is not on PATH - install it from the herdr card first, then run this again.'
  return
}

function Expand-Tilde($p) {
  if ($p -eq '~') { return $HOME }
  if ($p.StartsWith('~/') -or $p.StartsWith('~\')) { return Join-Path $HOME $p.Substring(2) }
  return $p
}

# The page substitutes its form values in, and leaves an unfilled {token} as-is.
if (-not $Dest -or $Dest[0] -eq '{') { $Dest = [Environment]::GetFolderPath('Desktop') }
$Dest = Expand-Tilde $Dest

# Refuse rather than create: a typo would otherwise put the launcher in a new tree
# and leave the user hunting for it.
if (-not (Test-Path -LiteralPath $Dest -PathType Container)) {
  Write-Host "The install folder does not exist: $Dest"
  Write-Host 'Create it first, or leave -Dest off to use your Desktop.'
  return
}

# A shortcut stores its icon as a path, so the image has to reach the disk first.
$dir = Join-Path $env:LOCALAPPDATA 'herdr'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$tmp = Join-Path $dir 'icon.download'
if ($IconFile) {
  if (-not (Test-Path -LiteralPath $IconFile -PathType Leaf)) {
    Write-Host "Icon file not found: $IconFile"
    Write-Host 'Point -IconFile at an .ico, or leave it off to use herdr''s own icon.'
    return
  }
  Copy-Item -LiteralPath $IconFile -Destination $tmp -Force
} else {
  # Fetched aside so a bad response can't replace a working icon. A missing asset
  # answers with the SPA's HTML, so the check below is what makes the 200 mean
  # anything.
  Invoke-WebRequest -UseBasicParsing -Uri $IconUrl -OutFile $tmp
}

# A shortcut's icon is not validated by the shell: the wrong container gets no
# error and draws a blank page, so check the .ico magic number here. This applies
# to -IconFile too, which only a hand-typed path reaches: the page emits this
# script for Windows alone, where the icon it builds is already an .ico.
# ReadAllBytes, not Get-Content -Encoding Byte: that switch is 5.1-only and
# throws under PowerShell 7, which aborts before the shortcut is written.
$head = [IO.File]::ReadAllBytes($tmp)
if ($head.Length -lt 4 -or $head[0] -ne 0 -or $head[1] -ne 0 -or $head[2] -ne 1 -or $head[3] -ne 0) {
  Remove-Item -LiteralPath $tmp -Force
  if ($IconFile) {
    Write-Host "That file is not an .ico: $IconFile"
    Write-Host 'The card builds one when Windows is the selected platform - check the selector, then copy the command again.'
  } else {
    Write-Host "That URL did not return an icon: $IconUrl"
  }
  return
}

# Named after its own bytes: Explorer caches a shortcut's icon by path, so reusing
# one filename leaves a changed icon showing the previous image until the cache is
# cleared. A new icon means a new path, which nothing can have cached.
$tag = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.Substring(0, 8).ToLower()
$ico = Join-Path $dir "icon-$tag.ico"
Move-Item -LiteralPath $tmp -Destination $ico -Force

$link = Join-Path $Dest 'herdr.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($link)
$s.TargetPath = $exe
# herdr restores its own workspaces from its session file, so this only decides
# where a first-ever launch starts; home is the least surprising choice.
$s.WorkingDirectory = $HOME
$s.IconLocation = $ico
$s.Save()
Write-Host "Created $link"
