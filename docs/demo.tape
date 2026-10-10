# SlopBench demo GIF — record with: vhs docs/demo.tape
# (vhs: https://github.com/charmbracelet/vhs — install via pamac-installer vhs)
Output docs/demo.gif
Set Shell bash
Set FontSize 18
Set Width 920
Set Height 480
Set Padding 24

Type "cd ~/slopbench"
Enter
Type "node runner/demo.js"
Enter
Sleep 2s
Type "node runner/monitor.js --watch"
Enter
Sleep 4s