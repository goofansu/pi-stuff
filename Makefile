install: keybindings gondolin
	pi install .
	pi install https://github.com/davebcn87/pi-autoresearch

keybindings:
	cp keybindings.json ~/.pi/agent/keybindings.json

gondolin:
	pnpm install @earendil-works/gondolin

define skills-add
	npx skills add $(1) $(foreach s,$(2),-s $(s)) -g -a codex -a claude-code -y
endef

vendor-skills:
	$(call skills-add,anthropics/skills,skill-creator frontend-design pdf)
	$(call skills-add,mitsuhiko/agent-stuff,commit web-browser mermaid summarize)
	$(call skills-add,brave/brave-search-skills,web-search)

vendor-extensions:
	make -C extensions install
