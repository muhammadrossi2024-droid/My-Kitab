Add-Type -AssemblyName System.Drawing
$path = "C:\Users\User\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\9C081208F4B58C8B5707EC08F1FC7C96D602FFB2\transfers\2026-31\WhatsApp Image 2026-08-02 at 00.56.17.jpeg"
$bmp = New-Object System.Drawing.Bitmap($path)

$w = $bmp.Width
$h = $bmp.Height
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0

for ($y = 0; $y -lt $h; $y += 1) {
  for ($x = 0; $x -lt $w; $x += 1) {
    $p = $bmp.GetPixel($x, $y)
    $r = [int]$p.R; $g = [int]$p.G; $b = [int]$p.B
    $greenness = $g - [Math]::Max($r, $b)
    if ($greenness -gt 18) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

Write-Output "bbox: x=$minX..$maxX y=$minY..$maxY width=$($maxX-$minX) height=$($maxY-$minY)"
$bmp.Dispose()
