.PHONY: install keybindings packages skills

install: keybindings packages skills 

keybindings:
	mkdir -p ~/.pi/agent
	cp $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

packages:
	pi install .
	pi install ../pi-subagent
	pi install ../pi-remote-control
	pi install ../pi-web
	pi install https://github.com/earendil-works/pi-transcribe
	pi install npm:@earendil-works/pi-radius

skills:
	npx skills add goofansu/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/productivity -a pi -g -y
	npx skills add humanlayer/skills -s show-me -s visual-pr -a pi -g -y
	npx skills add cli/cli -s gh -a pi -g -y
	npx skills add herdrdev/herdr -s herdr -a pi -g -y
	npx skills add modem-dev/hunk/packages/hunk -s hunk-review -a pi -g -y
	npx skills add boldsoftware/exe.dev -s using-exe-dev -a pi -g -y
