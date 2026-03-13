install: keybindings gondolin
	pi install .
	pi install https://github.com/davebcn87/pi-autoresearch

keybindings:
	cp keybindings.json ~/.pi/agent/keybindings.json

gondolin:
	pnpm install @earendil-works/gondolin

vendor-skills:
	npx skills add anthropics/skills -s skill-creator -g -a codex -y
	npx skills add mitsuhiko/agent-stuff -s commit -s web-browser -s mermaid -s summarize -g -a codex -y
	npx skills add mitsuhiko/gh-issue-sync -g -a codex -y
	npx skills add brave/brave-search-skills -s web-search -g -a codex -y

vendor-extensions:
	make -C extensions
