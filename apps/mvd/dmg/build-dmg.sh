#!/bin/sh
# Builds the macOS disk images in dist/drop: mvd_<version>_macos_universal.dmg (runs natively on both kinds of Mac),
# mvd_<version>_macos_arm64.dmg (Apple Silicon only) and mvd_<version>_macos_amd64.dmg (Intel only). The window of
# each holds MVD.app and a link to /Applications, so installing is a drag. Runs on macOS only (hdiutil, lipo, codesign).
# The version stamped in the app is $VERSION, or "dev" when it is not set.
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "build-dmg.sh builds the macOS disk images and runs on macOS only." >&2
  exit 1
fi

version="${VERSION:-dev}"
work="dist/dmg"
drop="dist/drop"
rm -rf "$work"
mkdir -p "$work" "$drop"

# One program per architecture, and one that joins them. The build flags match the
# build-native target, apart from -H, which is Windows only.
for arch in arm64 amd64; do
  (cd apps/mvd && GOOS=darwin GOARCH="$arch" CGO_ENABLED=1 CGO_LDFLAGS="-framework UniformTypeIdentifiers" \
    go build -trimpath -tags desktop,production -ldflags "-s -w -X main.version=$version" -o "../../$work/mvd-$arch" .)
done
lipo -create -output "$work/mvd-universal" "$work/mvd-arm64" "$work/mvd-amd64"

# The icon is best effort: the logo is an SVG, which only the macOS thumbnailer can
# draw. Without one the app still works and shows the generic icon.
make_icon() {
  qlmanage -t -s 1024 -o "$work" assets/mvd-logo.svg >/dev/null 2>&1 &&
    [ -f "$work/mvd-logo.svg.png" ] &&
    mkdir "$work/MVD.iconset" &&
    sips --padToHeightWidth 1024 1024 --padColor FFFFFF "$work/mvd-logo.svg.png" --out "$work/square.png" >/dev/null &&
    for size in 16 32 128 256 512; do
      sips -z "$size" "$size" "$work/square.png" --out "$work/MVD.iconset/icon_${size}x${size}.png" >/dev/null &&
        sips -z "$((size * 2))" "$((size * 2))" "$work/square.png" --out "$work/MVD.iconset/icon_${size}x${size}@2x.png" >/dev/null ||
        return 1
    done &&
    iconutil -c icns "$work/MVD.iconset" -o "$work/MVD.icns"
}

icon=""
if [ -f assets/icons/mvd.icns ]; then
  echo "icon: assets/icons/mvd.icns"
  icon="assets/icons/mvd.icns"
elif make_icon; then
  echo "icon: built from assets/mvd-logo.svg"
  icon="$work/MVD.icns"
else
  echo "icon: none, the logo could not be rendered here"
fi

# Builds and checks the image of one kind: universal, arm64 or amd64.
make_dmg() {
  kind="$1"
  staging="$work/staging-$kind"
  mount="$PWD/$work/mount-$kind"
  # The file name comes from tools/release-assets.cjs, the one place that decides it.
  dmg="$drop/$(VERSION="$version" node tools/release-assets.cjs name mvd darwin "$kind" dmg)"
  mkdir -p "$staging"

  # The bundle is written by the same code the app uses to install itself.
  set -- -program "$work/mvd-$kind" -version "$version" -out "$staging/MVD.app"
  if [ -n "$icon" ]; then set -- "$@" -icon "$icon"; fi
  go run ./apps/mvd/writebundle "$@"

  # An ad-hoc signature, which Apple Silicon requires of anything it runs. It does not
  # make the app notarized: the first launch still needs "Open" from the context menu.
  codesign --force --deep --sign - "$staging/MVD.app"
  codesign --verify --deep --strict "$staging/MVD.app"

  ln -s /Applications "$staging/Applications"
  rm -f "$dmg"
  hdiutil create -volname MVD -srcfolder "$staging" -ov -format UDZO "$dmg"

  # Open the image the way a person would and check what they will find.
  mkdir -p "$mount"
  hdiutil attach -nobrowse -readonly -mountpoint "$mount" "$dmg" >/dev/null
  test -x "$mount/MVD.app/Contents/MacOS/mvd"
  plutil -lint "$mount/MVD.app/Contents/Info.plist"
  test -L "$mount/Applications"
  test "$(readlink "$mount/Applications")" = "/Applications"
  codesign --verify --deep --strict "$mount/MVD.app"
  archs="$(lipo -archs "$mount/MVD.app/Contents/MacOS/mvd")"
  hdiutil detach "$mount" -quiet >/dev/null
  # What the program holds must be what the name promises.
  case "$kind" in
    universal) want="x86_64 arm64" ;;
    arm64) want="arm64" ;;
    amd64) want="x86_64" ;;
  esac
  for each in $want; do
    case " $archs " in *" $each "*) ;; *) echo "$dmg holds [$archs], expected $each" >&2; exit 1 ;; esac
  done
  echo "$dmg verified: MVD.app (signed, ad hoc, $archs) and an Applications link"
}

for kind in universal arm64 amd64; do
  make_dmg "$kind"
done
