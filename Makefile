.PHONY: packages files skills

install: packages files skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/davebcn87/pi-autoresearch
	pi install https://github.com/mitsuhiko/pi-draw

files:
	mkdir -p ~/.pi/agent/agents
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json
	@ln -svf $(CURDIR)/AGENTS_USER.md ~/.pi/agent/AGENTS.md
	@for f in $(CURDIR)/agents/*.md; do \
		ln -svf $$f ~/.pi/agent/agents/$$(basename $$f); \
	done

define skills-add
	npx skills add $(1) $(if $(2),$(foreach s,$(2),-s $(s)),-s '*') -g -a codex -y
endef

skills:
	$(call skills-add,anthropics/skills,skill-creator frontend-design)
	$(call skills-add,badlogic/pi-skills,transcribe)
	$(call skills-add,mitsuhiko/agent-stuff,commit)
	$(call skills-add,obra/superpowers)
