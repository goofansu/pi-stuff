.PHONY: install keybindings skills packages

install: keybindings skills packages

keybindings:
	mkdir -p ~/.pi/agent
	cp $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	npx skills add goofansu/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/productivity -a pi -g -y
	npx skills add humanlayer/skills -s show-me -a pi -g -y
	npx skills add cli/cli -s gh -a pi -g -y
	npx skills add herdrdev/herdr -s herdr -a pi -g -y
	npx skills add modem-dev/hunk/packages/hunk -s hunk-review -a pi -g -y
	npx skills add boldsoftware/exe.dev -s using-exe-dev -a pi -g -y

packages:
	pi install .
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/earendil-works/pi-transcribe
	pi install npm:@earendil-works/pi-radius
