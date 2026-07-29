.PHONY: install symlink skills

install: symlink
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent

symlink:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json
	@ln -svf $(CURDIR)/agent/AGENTS.md ~/.pi/agent/AGENTS.md

skills:
	npx skills add ./skills -a claude-code -g -y
	npx skills add mattpocock/skills -a claude-code -g -y \
		-s ask-matt \
		-s codebase-design \
		-s domain-modeling \
		-s grill-with-docs \
		-s grilling \
		-s implement \
		-s setup-matt-pocock-skills \
		-s to-spec \
		-s to-tickets \
		-s triage \
		-s wayfinder \
		-s writing-great-skills
