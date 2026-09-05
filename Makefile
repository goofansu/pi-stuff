.PHONY: install packages keybindings agents skills

install: packages keybindings agents skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/earendil-works/pi-transcribe

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

agents:
	@mkdir -p ~/.pi/agent/agents
	@ln -svf $(CURDIR)/agents/*.md ~/.pi/agent/agents/

skills:
	# .agents/skills 
	npx skills add goofansu/skills/skills/engineering -a codex -g -y
	npx skills add mattpocock/skills/skills/engineering -a codex -g -y
	npx skills add mattpocock/skills/skills/productivity -a codex -g -y
	npx skills add humanlayer/skills -s show-me -a codex -g -y
	# .agents/skills + .claude/skills
	npx skills add cli/cli -s gh -a codex -a claude-code -g -y
	npx skills add herdrdev/herdr -s herdr -a codex -a claude-code -g -y
	npx skills add modem-dev/hunk -s hunk-review -a codex -a claude-code -g -y
