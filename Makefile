install: files
	pi install .
	pi install ../pi-remote-control
	pi install ../pi-subagent
	pi install https://github.com/davebcn87/pi-autoresearch

files:
	cp keybindings.json ~/.pi/agent/keybindings.json
	cp AGENTS_USER.md ~/.pi/agent/AGENTS.md

local-skills:
	@for skill in $(CURDIR)/skills/*/; do \
		name=$$(basename $$skill); \
		ln -svfn $$skill ~/.claude/skills/$$name; \
		ln -svfn $$skill ~/.codex/skills/$$name; \
	done

define skills-add
	npx skills add $(1) $(foreach s,$(2),-s $(s)) -g -a codex -a claude-code -y
endef

upstream-skills:
	$(call skills-add,anthropics/skills,skill-creator)
	$(call skills-add,badlogic/pi-skills,transcribe)
	$(call skills-add,mitsuhiko/agent-stuff,commit mermaid)
	$(call skills-add,tobi/qmd,qmd)
	$(call skills-add,obra/superpowers,brainstorming)

upstream-extensions:
	make -C extensions install
