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
	npx skills add mitsuhiko/agent-stuff -s pi-share -a pi -g -y
	npx skills add mattpocock/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/productivity -a pi -g -y
	npx skills add herdrdev/herdr -s herdr -a pi -a claude-code -g -y
	npx skills add modem-dev/hunk -s hunk-review -a pi -a claude-code -g -y
	npx skills add humanlayer/skills -s show-me -a pi -a claude-code -g -y
