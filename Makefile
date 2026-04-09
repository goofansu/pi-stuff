install: files
	pi install .
	pi install ../pi-remote-control
	pi install https://github.com/davebcn87/pi-autoresearch

files:
	cp keybindings.json ~/.pi/agent/keybindings.json
	cp AGENTS_USER.md ~/.pi/agent/AGENTS.md

define skills-add
	npx skills add $(1) $(foreach s,$(2),-s $(s)) -g -a codex -a claude-code -y
endef

vendor-skills:
	$(call skills-add,anthropics/skills,skill-creator frontend-design pdf)
	$(call skills-add,mitsuhiko/agent-stuff,commit mermaid summarize)
	$(call skills-add,brave/brave-search-skills,web-search)
	$(call skills-add,badlogic/pi-skills,transcribe)
	$(call skills-add,vercel-labs/skills,find-skills)
	$(call skills-add,vercel-labs/opensrc,opensrc)
	$(call skills-add,tobi/qmd,qmd)

vendor-extensions:
	make -C extensions install
