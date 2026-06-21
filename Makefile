.PHONY: packages keybindings skills

install: packages keybindings skills
packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-linear
	pi install https://github.com/mitsuhiko/pi-draw
	pi install https://github.com/davebcn87/pi-autoresearch
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

define skills-add
	npx skills add $(1)$(if $(2), $(foreach s,$(2),-s $(s)) -y) -g -a pi -a claude-code --copy
endef

skills:
	$(call skills-add,mitsuhiko/agent-stuff,pi-share)
	$(call skills-add,badlogic/pi-skills,transcribe)
	$(call skills-add,anthropics/skills,frontend-design skill-creator)
	$(call skills-add,mattpocock/skills,grill-with-docs grilling domain-modeling codebase-design)
