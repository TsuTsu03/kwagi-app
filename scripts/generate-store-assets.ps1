Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$storeOut = Join-Path $root 'store\assets'
$assetOut = Join-Path $root 'assets'
New-Item -ItemType Directory -Force -Path $storeOut | Out-Null

function New-Brush([string]$hex) { New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex)) }

function Draw-Kwagi([System.Drawing.Graphics]$g, [int]$size, [bool]$transparent) {
  $scale = $size / 1024.0
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($transparent) { $g.Clear([System.Drawing.Color]::Transparent) } else { $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0E1A')) }

  $brown = New-Brush '#8A5A2E'; $brownDark = New-Brush '#5E3F22'; $brownLight = New-Brush '#B57F4C'
  $cream = New-Brush '#F3E6CC'; $belly = New-Brush '#ECDAB6'; $amber = New-Brush '#F5B454'
  $eye = New-Brush '#2A1A0E'; $white = New-Brush '#FFFFFF'; $teal = New-Brush '#34D9C4'
  try {
    if (-not $transparent) {
      $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(42, 245, 180, 84))
      $g.FillEllipse($glow, [int](120*$scale), [int](110*$scale), [int](784*$scale), [int](784*$scale)); $glow.Dispose()
    }

    $tuftL = New-Object System.Drawing.Point[] 3
    $tuftL[0]=New-Object System.Drawing.Point ([int](300*$scale)),([int](250*$scale)); $tuftL[1]=New-Object System.Drawing.Point ([int](330*$scale)),([int](105*$scale)); $tuftL[2]=New-Object System.Drawing.Point ([int](430*$scale)),([int](230*$scale))
    $tuftR = New-Object System.Drawing.Point[] 3
    $tuftR[0]=New-Object System.Drawing.Point ([int](594*$scale)),([int](230*$scale)); $tuftR[1]=New-Object System.Drawing.Point ([int](694*$scale)),([int](105*$scale)); $tuftR[2]=New-Object System.Drawing.Point ([int](724*$scale)),([int](250*$scale))
    $g.FillPolygon($brownLight,$tuftL); $g.FillPolygon($brownLight,$tuftR)
    $g.FillEllipse($brown, [int](240*$scale), [int](340*$scale), [int](544*$scale), [int](590*$scale))
    $g.FillEllipse($brownLight, [int](210*$scale), [int](170*$scale), [int](604*$scale), [int](570*$scale))
    $g.FillEllipse($brownDark, [int](205*$scale), [int](430*$scale), [int](150*$scale), [int](365*$scale))
    $g.FillEllipse($brownDark, [int](669*$scale), [int](430*$scale), [int](150*$scale), [int](365*$scale))
    $g.FillEllipse($belly, [int](360*$scale), [int](575*$scale), [int](304*$scale), [int](310*$scale))

    $face = New-Object System.Drawing.Drawing2D.GraphicsPath
    $face.StartFigure()
    $face.AddBezier([float](512*$scale),[float](670*$scale),[float](350*$scale),[float](570*$scale),[float](285*$scale),[float](470*$scale),[float](305*$scale),[float](355*$scale))
    $face.AddBezier([float](305*$scale),[float](355*$scale),[float](325*$scale),[float](245*$scale),[float](440*$scale),[float](250*$scale),[float](512*$scale),[float](350*$scale))
    $face.AddBezier([float](512*$scale),[float](350*$scale),[float](584*$scale),[float](250*$scale),[float](699*$scale),[float](245*$scale),[float](719*$scale),[float](355*$scale))
    $face.AddBezier([float](719*$scale),[float](355*$scale),[float](739*$scale),[float](470*$scale),[float](674*$scale),[float](570*$scale),[float](512*$scale),[float](670*$scale))
    $face.CloseFigure(); $g.FillPath($cream,$face); $face.Dispose()

    foreach($x in @(408,616)) {
      $g.FillEllipse($amber,[int](($x-70)*$scale),[int](370*$scale),[int](140*$scale),[int](140*$scale))
      $g.FillEllipse($eye,[int](($x-55)*$scale),[int](385*$scale),[int](110*$scale),[int](110*$scale))
      $g.FillEllipse($white,[int](($x-28)*$scale),[int](405*$scale),[int](30*$scale),[int](30*$scale))
    }
    $beak = New-Object System.Drawing.Point[] 3
    $beak[0]=New-Object System.Drawing.Point ([int](512*$scale)),([int](500*$scale)); $beak[1]=New-Object System.Drawing.Point ([int](465*$scale)),([int](530*$scale)); $beak[2]=New-Object System.Drawing.Point ([int](512*$scale)),([int](565*$scale))
    $g.FillPolygon($amber,$beak)
    $g.FillEllipse($teal,[int](470*$scale),[int](720*$scale),[int](34*$scale),[int](34*$scale)); $g.FillEllipse($teal,[int](520*$scale),[int](720*$scale),[int](34*$scale),[int](34*$scale))
  } finally {
    $brown.Dispose(); $brownDark.Dispose(); $brownLight.Dispose(); $cream.Dispose(); $belly.Dispose(); $amber.Dispose(); $eye.Dispose(); $white.Dispose(); $teal.Dispose()
  }
}

function Save-Kwagi([string]$path, [int]$size, [bool]$transparent) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try { Draw-Kwagi $graphics $size $transparent; $bitmap.Save($path,[System.Drawing.Imaging.ImageFormat]::Png) }
  finally { $graphics.Dispose(); $bitmap.Dispose() }
}

function Save-AdaptiveBackground([string]$path) {
  $bitmap = New-Object System.Drawing.Bitmap 1024,1024
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0E1A'))
    $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34,245,180,84))
    $graphics.FillEllipse($glow,120,120,784,784); $glow.Dispose()
    $bitmap.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

function Save-Monochrome([string]$path) {
  $bitmap = New-Object System.Drawing.Bitmap 1024,1024,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias; $graphics.Clear([System.Drawing.Color]::Transparent)
    $white=New-Brush '#FFFFFF'
    try {
      $graphics.FillEllipse($white,260,280,504,650); $graphics.FillEllipse($white,210,170,604,570)
      $left=New-Object System.Drawing.Point[] 3; $left[0]=New-Object System.Drawing.Point 300,250; $left[1]=New-Object System.Drawing.Point 330,105; $left[2]=New-Object System.Drawing.Point 430,230
      $right=New-Object System.Drawing.Point[] 3; $right[0]=New-Object System.Drawing.Point 594,230; $right[1]=New-Object System.Drawing.Point 694,105; $right[2]=New-Object System.Drawing.Point 724,250
      $graphics.FillPolygon($white,$left); $graphics.FillPolygon($white,$right)
    } finally { $white.Dispose() }
    $bitmap.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

Save-Kwagi (Join-Path $assetOut 'icon.png') 1024 $false
Save-Kwagi (Join-Path $assetOut 'android-icon-foreground.png') 1024 $true
Save-Kwagi (Join-Path $assetOut 'splash-icon.png') 1024 $true
Save-Kwagi (Join-Path $assetOut 'favicon.png') 64 $false
Save-AdaptiveBackground (Join-Path $assetOut 'android-icon-background.png')
Save-Monochrome (Join-Path $assetOut 'android-icon-monochrome.png')
Save-Kwagi (Join-Path $storeOut 'google-play-icon-512x512.png') 512 $false

$source = [System.Drawing.Image]::FromFile((Join-Path $assetOut 'android-icon-foreground.png'))
$feature = New-Object System.Drawing.Bitmap 1024, 500
$graphics = [System.Drawing.Graphics]::FromImage($feature)
try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias; $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0E1A'))
  $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35,245,180,84)); $graphics.FillEllipse($glow,650,35,430,430); $glow.Dispose()
  $eyebrowFont = New-Object System.Drawing.Font 'Segoe UI',15,([System.Drawing.FontStyle]::Bold); $titleFont = New-Object System.Drawing.Font 'Segoe UI',64,([System.Drawing.FontStyle]::Bold); $bodyFont = New-Object System.Drawing.Font 'Segoe UI',22
  $teal=New-Brush '#34D9C4'; $amber=New-Brush '#F5B454'; $cream=New-Brush '#F7F2E8'
  try {
    $graphics.DrawString('OFFLINE STUDY COMPANION',$eyebrowFont,$teal,72,112); $graphics.DrawString('Kwagi',$titleFont,$amber,66,146); $graphics.DrawString("Notes, flashcards, quizzes,`nand steady progress.",$bodyFont,$cream,72,250); $graphics.DrawImage($source,650,70,360,360)
  } finally { $eyebrowFont.Dispose(); $titleFont.Dispose(); $bodyFont.Dispose(); $teal.Dispose(); $amber.Dispose(); $cream.Dispose() }
  $feature.Save((Join-Path $storeOut 'google-play-feature-graphic-1024x500.png'),[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $feature.Dispose(); $source.Dispose() }

Write-Output 'Generated Kwagi app icons, splash art, and Google Play listing assets.'
