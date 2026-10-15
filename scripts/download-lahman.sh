#!/bin/sh
# Downloads the Lahman Baseball Database 2025 CSV files from SABR's Box folder and checks each one's SHA-256.
# The folder: https://sabr.box.com/s/y1prhc795jk8zvmelfd3jq7tl389y6cd (linked from https://sabr.org/lahman-database/).
set -eu
dir=datasets/raw/lahman
mkdir -p "$dir"
while read -r sum name id; do
  curl -sSfL -o "$dir/$name" "https://sabr.box.com/index.php?rm=box_download_shared_file&shared_name=y1prhc795jk8zvmelfd3jq7tl389y6cd&file_id=$id"
  echo "$sum  $dir/$name" | shasum -a 256 -c -
done <<'EOF'
9e89c77213a54f97785a79fa3898a69a72f6fb8203e27ddc63b9dc91f5a934b8  AllstarFull.csv f_2084259592081
9afc0d3ab78462ddf9e234485dbee5406654aacb2b381e8acd86d34f351945cb  AwardsPlayers.csv f_2084273346810
007551e2fe3072aff396a8573de61dceabe14dbf8de20038c8b60e2abe16978f  Batting.csv f_2084272468053
0d0c8ddecbe789254651a8cad379dd949d343eba5e15cc17e6234ca0e4fcf456  HallOfFame.csv f_2084268925644
a21ec5da44dcb978b75cfd04f3167b00abd9f5e0f9b3143176833dd3dc1d9da9  Managers.csv f_2084260192585
9ee97110fc88b2c4ad72684577d696875035049e74a45cb93238458df8563c58  People.csv f_2084263017537
dbbe1baeb0a0fd81c1843a19eb4967e3d86c073fbe51bf96581bfd9faae35951  Pitching.csv f_2084261668691
a1d596d2f45112b5ea77623f4bfaa400a6ef0d325b52939ad96f4d53676ee845  Salaries.csv f_2084273174150
507918cbb9dea12fd353b2a68a36e6ad481f8bcd58e51698cf3889b78d52254a  SeriesPost.csv f_2084273716683
0e7afdd8b837d0edaca770a28817eec6613bd8255979c1be6e3f5827f4b88fd6  Teams.csv f_2084266946255
fc58735a8f767f11c27bccbbee38ea850a00e27c0216fb2a60cc4185a99bf398  TeamsFranchises.csv f_2084266696141
EOF
