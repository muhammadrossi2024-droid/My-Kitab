Add-Type -AssemblyName System.Drawing

function Get-Alpha([int]$chroma, [int]$loT, [int]$hiT) {
  if ($chroma -le $loT) { return 0 }
  if ($chroma -ge $hiT) { return 255 }
  return [int]((($chroma - $loT) / ($hiT - $loT)) * 255)
}

function Process-Logo {
  param(
    [string]$SrcPath,
    [string]$OutPath,
    [int]$PadX = 14,
    [int]$PadY = 14,
    [double]$SharpenAmount = 0.45
  )

  $src = New-Object System.Drawing.Bitmap($SrcPath)
  $w = $src.Width
  $h = $src.Height

  # Re-find bbox per-image using greenness (dominant-channel) detection.
  $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $p = $src.GetPixel($x, $y)
      $r = [int]$p.R; $g = [int]$p.G; $b = [int]$p.B
      $chroma = ([Math]::Max($r, [Math]::Max($g, $b))) - ([Math]::Min($r, [Math]::Min($g, $b)))
      if ($chroma -gt 14) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $cropX = [Math]::Max(0, $minX - $PadX)
  $cropY = [Math]::Max(0, $minY - $PadY)
  $cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + 2 * $PadX)
  $cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + 2 * $PadY)
  Write-Output "  bbox: x=$minX..$maxX y=$minY..$maxY -> crop ($cropX,$cropY,$cropW,$cropH)"

  $out = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  # Narrower alpha transition band than before (14/30 vs the original 16/34)
  # for a crisper matte edge — the wide gradient was contributing to the
  # "soft" look independent of pixel resolution.
  $loT = 14
  $hiT = 30

  for ($oy = 0; $oy -lt $cropH; $oy++) {
    for ($ox = 0; $ox -lt $cropW; $ox++) {
      $p = $src.GetPixel($cropX + $ox, $cropY + $oy)
      $r = [int]$p.R; $g = [int]$p.G; $b = [int]$p.B
      $chroma = ([Math]::Max($r, [Math]::Max($g, $b))) - ([Math]::Min($r, [Math]::Min($g, $b)))
      $alpha = Get-Alpha $chroma $loT $hiT
      $out.SetPixel($ox, $oy, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
    }
  }
  $src.Dispose()

  # Mild unsharp-mask-style 3x3 convolution on RGB (alpha untouched) to
  # counteract the inherent softness of a phone-photographed source —
  # applied via LockBits for speed since this touches every pixel.
  $rect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
  $bd = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $bd.Stride
  $bytes = New-Object byte[] ($stride * $cropH)
  [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $bytes, 0, $bytes.Length)
  $orig = $bytes.Clone()

  $centerK = 1 + 4 * $SharpenAmount
  $edgeK = -$SharpenAmount

  for ($y = 1; $y -lt ($cropH - 1); $y++) {
    $rowBase = $y * $stride
    for ($x = 1; $x -lt ($cropW - 1); $x++) {
      $i = $rowBase + $x * 4
      for ($c = 0; $c -lt 3; $c++) {
        $centerV = [int]$orig[$i + $c]
        $upV = [int]$orig[$i - $stride + $c]
        $downV = [int]$orig[$i + $stride + $c]
        $leftV = [int]$orig[$i - 4 + $c]
        $rightV = [int]$orig[$i + 4 + $c]
        $val = $centerV * $centerK + ($upV + $downV + $leftV + $rightV) * $edgeK
        if ($val -lt 0) { $val = 0 }
        if ($val -gt 255) { $val = 255 }
        $bytes[$i + $c] = [byte]$val
      }
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bd.Scan0, $bytes.Length)
  $out.UnlockBits($bd)

  $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Output "  wrote $OutPath ($cropW x $cropH)"
}

Process-Logo -SrcPath "C:\Users\User\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\transfers\2026-31\WhatsApp Image 2026-08-02 at 00.56.17.jpeg" -OutPath "C:\Users\User\quran-app\public\logo-dark.png"
Process-Logo -SrcPath "C:\Users\User\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\transfers\2026-31\WhatsApp Image 2026-08-02 at 00.56.16.jpeg" -OutPath "C:\Users\User\quran-app\public\logo-light.png"
