.PHONY: packages agents keybindings skills

install: packages agents keybindings skills

packages:
	pi install https://github.com/goofansu/pi-stuff
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/davebcn87/pi-autoresearch
	pi install https://github.com/obra/superpowers

agents:
	mkdir -p ~/.pi/agent/agents
	@for f in $(CURDIR)/agents/*.md; do \
		ln -svf $$f ~/.pi/agent/agents/$$(basename $$f); \
	done

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

define skill-install
	gh skill install $(1) $(if $(2),$(foreach s,$(2),$(s)),--all) --agent pi --scope user --force
endef

skills:
	$(call skill-install,anthropics/skills,frontend-design)
	$(call skill-install,mattpocock/skills,grill-with-docs)
