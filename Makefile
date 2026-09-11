.PHONY: install packages keybindings

install: packages keybindings

packages:
	pi install .
	pi install https://github.com/goofansu/pi-web
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/earendil-works/pi-transcribe

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json
