.PHONY: skills

install: keybindings
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	npx skills add mattpocock/skills -a claude-code -a codex -a pi -g -y \
		-s ask-matt \
		-s codebase-design \
		-s domain-modeling \
		-s grill-with-docs \
		-s grilling \
		-s setup-matt-pocock-skills \
		-s to-spec \
		-s to-tickets \
		-s triage \
		-s wayfinder \
		-s writing-great-skills
