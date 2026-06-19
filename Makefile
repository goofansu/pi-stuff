.PHONY: packages keybindings skills

install: packages keybindings skills

packages:
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/goofansu/pi-linear
	pi install https://github.com/davebcn87/pi-autoresearch
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	gh skill install mitsuhiko/agent-stuff pi-share --agent pi --scope user
