{
  description = "RESOLVE — ambientes de desenvolvimento (frontend, e2e e backend nativo)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems =
        f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          # Os Dockerfiles do backend fixam `node:20-alpine`, mas o Node 20 saiu de
          # suporte em 2026-04-30 e já não existe mais no nixpkgs. O 22 é o LTS vivo
          # mais próximo e roda tudo que o repo precisa (Next 16 exige >= 20.9).
          node = pkgs.nodejs_22;

          # O Playwright casa o pacote npm com um build EXATO de navegador. Por isso
          # o `e2e/package.json` fixa a mesma versão que este `playwright-driver`
          # empacota — se as duas divergirem, o teste morre com
          # "Executable doesn't exist at .../chromium-XXXX". O shellHook abaixo avisa
          # antes de você descobrir isso no meio de uma execução.
          playwright = pkgs.playwright-driver;
        in
        {
          # `nix develop` — frontend (Next) + suíte E2E (Playwright).
          default = pkgs.mkShell {
            packages = [
              node
              pkgs.jq
            ];

            # Usa os navegadores já empacotados pelo nixpkgs em vez de baixar um
            # binário dinâmico que não roda no NixOS.
            PLAYWRIGHT_BROWSERS_PATH = "${playwright.browsers}";
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
            # As checagens de host do Playwright procuram distro/libs no padrão FHS,
            # que o NixOS não segue — as libs certas já vêm com o pacote acima.
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";

            shellHook = ''
              raiz=$(git rev-parse --show-toplevel 2>/dev/null || echo .)
              esperado="${playwright.version}"
              instalado=$(jq -r '.packages["node_modules/@playwright/test"].version // empty' \
                "$raiz/e2e/package-lock.json" 2>/dev/null)

              if [ -n "$instalado" ] && [ "$instalado" != "$esperado" ]; then
                echo "⚠️  Playwright fora de sincronia:"
                echo "    e2e/package-lock.json → $instalado"
                echo "    playwright-driver     → $esperado (navegadores deste shell)"
                echo "    Alinhe o package.json para $esperado (ou rode 'nix flake update')."
                echo
              fi

              echo "RESOLVE · shell padrão (frontend + e2e)"
              echo "  node $(node --version) · npm $(npm --version) · playwright ${playwright.version}"
              echo "  navegadores: ${playwright.browsers} (nixpkgs, sem download)"
              echo
              echo "  cd frontend && npm install && npm run dev"
              echo "  cd e2e && npm install && npm test        # sobe o frontend sozinho"
              echo "  backend: docker compose (ver README) ou 'nix develop .#backend'"
            '';
          };

          # `nix develop .#backend` — caminho "sem Docker" documentado no e2e/README:
          # Postgres e Redis locais + os 4 serviços rodando direto com Node.
          backend = pkgs.mkShell {
            packages = [
              node
              pkgs.postgresql_16
              pkgs.redis
              pkgs.openssl
            ];

            # O Prisma do repo é o 5.x e o do nixpkgs já está no 7.x — versões de
            # engine incompatíveis. Por isso NÃO apontamos PRISMA_*_ENGINE aqui:
            # deixamos o npm baixar os engines 5.x dele mesmo e damos a esses
            # binários dinâmicos o loader e as libs de que precisam, via nix-ld.
            NIX_LD = "${pkgs.stdenv.cc.bintools.dynamicLinker}";
            NIX_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
              pkgs.openssl
              pkgs.zlib
              pkgs.stdenv.cc.cc.lib
            ];

            shellHook = ''
              echo "RESOLVE · shell do backend (Postgres + Redis + Node nativos)"
              echo "  node $(node --version) · postgres $(pg_ctl --version | awk '{print $NF}') · redis $(redis-server --version | awk '{print $3}' | cut -d= -f2)"
              echo
              echo "  Este shell é para rodar os serviços SEM container."
              echo "  O caminho padrão do projeto continua sendo:"
              echo "    cd backend && docker compose --env-file .env.local up -d --build"
            '';
          };
        }
      );
    };
}
