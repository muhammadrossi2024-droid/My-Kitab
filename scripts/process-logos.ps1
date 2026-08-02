Add-Type -AssemblyName System.Drawing

function Process-Logo {
  param(
    [string]$SrcPath,
    [string]$OutPath,
    [int]$PadX = 18,
    [int]$PadY = 18
  )

  $bmp = New-Object System.Drawing.Bitmap($SrcPath)
  $w = $bmp.Width
  $h = $bmp.Height

  # Re-find bbox per-image using greenness (dominant-channel) detection,
  # since crop coordinates must match this specific file's content.
  $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $p = $bmp.GetPixel($x, $y)
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

  for ($oy = 0; $oy -lt $cropH; $oy++) {
    for ($ox = 0; $ox -lt $cropW; $ox++) {
      $p = $bmp.GetPixel($cropX + $ox, $cropY + $oy)
      $r = [int]$p.R; $g = [int]$p.G; $b = [int]$p.B
      $chroma = ([Math]::Max($r, [Math]::Max($g, $b))) - ([Math]::Min($r, [Math]::Min($g, $b)))

      $loT = 16
      $hiT = 34
      if ($chroma -le $loT) {
        $alpha = 0
      } elseif ($chroma -ge $hiT) {
        $alpha = 255
      } else {
        $alpha = [int]((($chroma - $loT) / ($hiT - $loT)) * 255)
      }

      $newColor = [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b)
      $out.SetPixel($ox, $oy, $newColor)
    }
  }

  $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $out.Dispose()
  Write-Output "  wrote $OutPath ($cropW x $cropH)"
}

Process-Logo -SrcPath "C:\Users\User\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\transfers\2026-31\WhatsApp Image 2026-08-02 at 00.56.17.jpeg" -OutPath "C:\Users\User\quran-app\public\logo-dark.png"
Process-Logo -SrcPath "C:\Users\User\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\transfers\2026-31\WhatsApp Image 2026-08-02 at 00.56.16.jpeg" -OutPath "C:\Users\User\quran-app\public\logo-light.png"
