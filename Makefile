.PHONY: install packages agents skills

install: packages agents skills

packages:
	pi install .
	pi install ../pi-remote-control
	pi install ../pi-subagent
	pi install ../pi-web
	pi install npm:@earendil-works/pi-radius
	pi install npm:@earendil-works/pi-voice

agents:
	mkdir -p ~/.pi/agent/agents
	cp agents/*.md ~/.pi/agent/agents/

skills: engineering-skills workflow-skills tool-skills

engineering-skills:
	npx skills add goofansu/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/engineering -a pi -g -y
	npx skills add mattpocock/skills/skills/productivity -a pi -g -y

workflow-skills:
	npx skills add humanlayer/skills -s show-me -s visual-pr -a pi -g -y
	npx skills add mitsuhiko/agent-stuff -s librarian -a pi -g -y

tool-skills:
	npx skills add boldsoftware/exe.dev -s using-exe-dev -a pi -g -y
	npx skills add cli/cli -s gh -a pi -g -y
	npx skills add herdrdev/herdr -s herdr -a pi -g -y
	npx skills add modem-dev/hunk/packages/hunk -s hunk-review -a pi -g -y
	npx skills add typesafe-ai/skills -s typesafe-ai -a pi -g -y
