install: packages keybindings skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-remote-control

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	npx skills add goofansu/skills -s commit -a pi -g -y
