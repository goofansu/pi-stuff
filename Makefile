.PHONY: install packages keybindings agents skills

install: packages keybindings agents skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-remote-control

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

agents:
	@mkdir -p ~/.pi/agent/agents
	@ln -svf $(CURDIR)/agents/*.md ~/.pi/agent/agents/

skills:
	npx skills add goofansu/skills -s commit -a pi -g -y
	npx skills add mattpocock/skills -s setup-matt-pocock-skills -s to-spec -a pi -g -y
	npx skills add herdrdev/herdr -s herdr -a pi -a claude-code -a codex -g -y
