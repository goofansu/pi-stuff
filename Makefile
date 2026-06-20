.PHONY: packages keybindings skills

install: packages keybindings skills
packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-linear
	pi install https://github.com/davebcn87/pi-autoresearch
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

define skills-add
	npx skills add $(1) $(if $(2),$(foreach s,$(2),-s $(s)),-s '*') -a pi -g -y
endef

skills:
	$(call skills-add,anthropics/skills,frontend-design) 
	$(call skills-add,mattpocock/skills,codebase-design domain-modeling)
