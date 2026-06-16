.PHONY: packages agents keybindings skills

install: packages agents keybindings skills

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

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

define skills-add
	npx skills add $(1) $(if $(2),$(foreach s,$(2),-s $(s)),-s '*') -g -a pi -y
endef

skills:
	$(call skills-add,anthropics/skills,frontend-design)
	$(call skills-add,mattpocock/skills,grill-with-docs)
	$(call skills-add,obra/superpowers)
