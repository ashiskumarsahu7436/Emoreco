{pkgs}: {
  deps = [
    pkgs.gnumake
    pkgs.gcc
    pkgs.python312Packages.setuptools
    pkgs.python3
  ];
}
