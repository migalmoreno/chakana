{
  description = "Chakana — self-hosted, map-driven orchestration tool";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
    flake-parts.url = "github:hercules-ci/flake-parts";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      imports = [ inputs.process-compose-flake.flakeModule ];

      perSystem =
        { config, pkgs, ... }:
        let
          # Daily build of the Protomaps basemap. Bump this date to refresh.
          pmtilesBuild = "20260920";
          pmtilesUrl = "https://build.protomaps.com/${pmtilesBuild}.pmtiles";

          # Whole-world basemap, maxzoom 6 (~43 MB). Raise maxzoom for more
          # street-level detail at the cost of a larger file.
          download-basemap = pkgs.writeShellApplication {
            name = "download-basemap";
            runtimeInputs = [
              pkgs.pmtiles
              pkgs.curl
            ];
            text = ''
              OUT="''${1:-apps/web/public/world.pmtiles}"
              MAXZOOM="''${2:-6}"
              mkdir -p "$(dirname "$OUT")"
              echo "Extracting ${pmtilesUrl} (maxzoom=$MAXZOOM) -> $OUT"
              pmtiles extract "${pmtilesUrl}" "$OUT" --maxzoom="$MAXZOOM"
              echo "Done: $OUT"
            '';
          };

          runtimePackages = with pkgs; [
            bash
            coreutils
            nodejs_24
          ];
        in
        {
          packages.download-basemap = download-basemap;

          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_24
              pmtiles
              wireguard-tools
              iproute2
              jq
              curl
            ];
            shellHook = ''
              echo "Chakana dev shell"
              echo "  Node: $(node --version)"
              if [ ! -d node_modules ]; then
                echo ""
                echo "Installing npm dependencies..."
                npm install
              fi
              if [ ! -f apps/web/public/world.pmtiles ]; then
                echo ""
                echo "No basemap found. Run:  nix run .#download-basemap"
              fi
            '';
          };

          process-compose.default = {
            cli.environment.PC_DISABLE_TUI = true;
            cli.options.no-server = true;
            settings.processes = {
              api = {
                command = "${pkgs.nodejs_24}/bin/npm run dev:api";
                environment.PATH = pkgs.lib.makeBinPath runtimePackages;
                readiness_probe = {
                  http_get = {
                    host = "localhost";
                    port = 8080;
                    path = "/api/health";
                  };
                  initial_delay_seconds = 2;
                  period_seconds = 3;
                };
              };

              web = {
                command = "${pkgs.nodejs_24}/bin/npm run dev:web";
                environment.PATH = pkgs.lib.makeBinPath runtimePackages;
                depends_on.api.condition = "process_healthy";
              };
            };
          };
        };
    };
}
