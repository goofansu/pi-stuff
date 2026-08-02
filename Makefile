.PHONY: packages files skills

install: packages files skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/obra/superpowers

files:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	npx skills add ./skills -a claude-code -g -y
	npx skills add mattpocock/skills -a claude-code -g
