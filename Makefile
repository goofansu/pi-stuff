.PHONY: packages agents skills

install: packages agents skills keybindings

packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/davebcn87/pi-autoresearch

agents:
	mkdir -p ~/.pi/agent/agents
	@for f in $(CURDIR)/agents/*.md; do \
		ln -svf $$f ~/.pi/agent/agents/$$(basename $$f); \
	done

skills:
	mkdir -p ~/.pi/agent/skills
	@for d in $(CURDIR)/skills/*/; do \
		ln -svfn $$d ~/.pi/agent/skills/$$(basename $$d); \
	done

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

define skills-add
	npx skills add $(1) $(if $(2),$(foreach s,$(2),-s $(s)),-s '*') -g -a codex -y
endef

third-party-skills:
	$(call skills-add,anthropics/skills,skill-creator frontend-design)
	$(call skills-add,max-sixty/worktrunk,worktrunk)
	$(call skills-add,obra/superpowers)
