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
		-s implement \
		-s tdd \
		-s code-review \
		-s codebase-design \
		-s triage
	npx skills add mattpocock/skills -a pi -g -y \
		-s setup-matt-pocock-skills \
		-s grill-with-docs \
		-s grilling \
		-s domain-modeling \
		-s to-spec \
		-s to-tickets \
		-s wayfinder \
		-s prototype \
		-s research \
		-s triage \
		-s writing-great-skills
