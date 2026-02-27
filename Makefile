install: gondolin
	pi install .
	cp keybindings.json ~/.pi/agent/keybindings.json

gondolin:
	npm install @earendil-works/gondolin

add-skills:
	npx skills add anthropics/skills -s skill-creator -g -a codex -y
	npx skills add mitsuhiko/agent-stuff -s commit -s web-browser -g -a codex -y
	npx skills add mitsuhiko/gh-issue-sync -g -a codex -y

update-skills:
	npx skills update

list-skills:
	npx skills ls -g

vendor-extensions:
	make -C extensions
