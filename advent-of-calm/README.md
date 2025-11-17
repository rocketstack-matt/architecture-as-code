# Advent of CALM

A 24-day progressive learning challenge for the Common Architecture Language Model (CALM).

## Overview

**Advent of CALM** is a structured learning journey that takes participants from zero CALM knowledge to being able to model production architectures and contribute to the community in 24 days.

Inspired by "Advent of Code" and Morgan Stanley's "YETI Advent of Modern", this challenge provides daily hands-on tasks that progressively build skills in architecture as code.

## Structure

### Week 1: Foundation & First Steps (Days 1-7)
Learn CALM basics and create your first complete architecture

- **Day 1**: Install CALM CLI and Initialize Repository
- **Day 2**: Create Your First Node
- **Day 3**: Connect Nodes with Relationships
- **Day 4**: Install the CALM VSCode Extension
- **Day 5**: Add Interfaces to Nodes
- **Day 6**: Document with Metadata
- **Day 7**: Build a Complete E-Commerce Microservice Architecture

### Week 2: Patterns, Controls & Flows (Days 8-13)
Master intermediate CALM concepts and governance features

- **Day 8**: Create Your First Pattern - CALM's Superpower
- **Day 9**: Reverse-Engineer a Pattern from Your Architecture
- **Day 10**: Add a Security Control
- **Day 11**: Model a Business Flow
- **Day 12**: Add Multiple Interface Types
- **Day 13**: Link to an ADR

### Week 3: Tooling & Automation (Days 14-18)
Leverage the full CALM ecosystem

- **Day 14**: Generate Documentation with Docify
- **Day 15**: Create a Custom Template Bundle
- **Day 16**: Set Up CALM Hub Locally
- **Day 17**: Advanced AI-Powered Architecture Refactoring
- **Day 18**: Automate Validation in CI/CD

### Week 4: Real-World Application & Community (Days 19-24)
Apply CALM to real scenarios and contribute back

- **Day 19**: Model Your Actual System Architecture
- **Day 20**: Add Deployment Topology
- **Day 21**: Model Data Lineage
- **Day 22**: Create a Migration from Existing Documentation
- **Day 23**: Contribute to the CALM Community
- **Day 24**: Present Your CALM Journey

## How It Works

### Timing
- **Release**: A new challenge is published each day (Days 1-24)
- **Completion**: Complete challenges as able - weekday releases should be completed same day, weekend releases on next working day
- **Flexibility**: Work at your own pace, but daily progression recommended

### Tracking Progress
- Each day involves making changes to your git repository
- Commit your work with descriptive messages
- Tag each day's completion: `git tag day-1`, `git tag day-2`, etc.
- Update your README progress checklist daily

### Deliverables
- All work done in a personal `advent-of-calm-2025` git repository
- Each day produces:
  - Code/architecture changes
  - Tagged git commit
  - Updated README with progress
  - Screenshots where appropriate

### Final Submission
At the end of 24 days, your repository should contain:
- Complete CALM architectures (multiple)
- Reusable patterns
- Documentation templates
- CI/CD workflows
- JOURNEY.md summarizing your experience

## Getting Started

### Prerequisites
- Git installed
- Node.js and npm installed
- VSCode editor (recommended)
- GitHub account (recommended for portfolio sharing)
- GitHub Copilot access (optional but helpful)

### Quick Start

1. **Start with Day 1:**
   ```bash
   # Read the challenge
   cat day-1.md
   
   # Follow the instructions
   mkdir advent-of-calm-2025
   cd advent-of-calm-2025
   git init
   npm install -g @finos/calm-cli
   ```

2. **Progress daily:**
   - Read each day's markdown file
   - Complete the requirements
   - Commit and tag your work
   - Move to next day

3. **Track your progress:**
   - Update your repository's README
   - Take screenshots of visualizations
   - Document learnings and questions

4. **Share your journey:**
   - Make repository public (optional)
   - Share on social media with #AdventOfCALM
   - Help others in the FINOS community

## Success Criteria

To successfully complete Advent of CALM:

- ✅ Complete at least 18 of 24 days (75%)
- ✅ Create at least one production-ready architecture (Day 19)
- ✅ Create at least one reusable pattern (Days 8-9)
- ✅ Make at least one community contribution (Day 23)
- ✅ Create JOURNEY.md retrospective (Day 24)
- ✅ Repository is git-tagged and portfolio-ready

## Learning Approach

### Progressive Complexity
- **Days 1-7**: Single concepts in isolation
- **Days 8-13**: Combining concepts
- **Days 14-18**: Tools and automation
- **Days 19-24**: Synthesis and real-world application

### Immediate Feedback
- Each challenge produces a tangible artifact
- Validation ensures you're on track
- Visualization provides visual confirmation
- Git tags create clear milestones

### Multi-Modal Learning
- **Hands-on**: Editing architecture files
- **Visual**: Using VSCode extension
- **Automated**: CLI tools and CI/CD
- **Social**: Community engagement

## Tools You'll Use

### Required
- **CALM CLI**: `npm install -g @finos/calm-cli`
- **Git**: Version control and portfolio building

### Recommended
- **CALM VSCode Extension**: [Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=FINOS.calm-vscode-plugin)
- **GitHub Copilot**: AI assistance (uses chatmode from Day 1)
- **Docker**: For CALM Hub (Day 16)

### Optional
- **GitHub Account**: For public portfolio
- **Blog Platform**: For sharing your journey

## File Descriptions

Each `day-X.md` file contains:
- **Overview**: What you'll accomplish
- **Objective and Rationale**: Why this matters
- **Requirements**: Step-by-step instructions with AI prompts
- **Deliverables**: What to produce and commit
- **Validation**: How to verify completion
- **Resources**: Links to documentation
- **Tips and Pitfalls**: Practical advice
- **Next Steps**: Preview of tomorrow

## Community Support

### Getting Help
- **FINOS Community**: [Monthly meetups](https://github.com/finos/architecture-as-code/issues?q=label%3Ameeting)
- **GitHub Issues**: [Ask questions](https://github.com/finos/architecture-as-code/issues/new/choose)
- **Office Hours**: Every Thursday (see [FINOS Calendar](http://calendar.finos.org))

### Sharing Progress
- Use hashtag `#AdventOfCALM` on social media
- Share repository link in FINOS community
- Blog about your experience
- Help others who are following the challenge

## Recognition

### Portfolio Value
- Demonstrates architecture skills
- Shows commitment to learning
- Proves hands-on CALM expertise
- Public portfolio piece for resume/LinkedIn

### Community Recognition
- Complete all 24 days → featured in FINOS newsletter
- Contribute to CALM project (Day 23) → acknowledgment in project
- Share exceptional work → showcase in CALM documentation

## Tips for Success

1. **Start on time**: Day 1 sets you up for success
2. **Commit daily**: Don't let days pile up
3. **Use AI assistance**: The chatmode is there to help
4. **Visualize frequently**: See your progress in diagrams
5. **Ask questions**: Use the community resources
6. **Share learnings**: Document insights in commits
7. **Be realistic**: 18/24 is success, 24/24 is exceptional
8. **Make it public**: Share your learning journey
9. **Help others**: Answer questions in the community
10. **Celebrate**: Day 24 is about reflecting on how far you've come

## FAQ

**Q: Do I need to complete every day?**
A: No, completing 18 of 24 days (75%) is considered successful completion.

**Q: Can I do multiple days at once?**
A: Yes, but daily progression helps with retention and prevents overwhelm.

**Q: What if I don't have GitHub Copilot?**
A: The challenge includes manual alternatives for all AI-assisted steps.

**Q: Can I use a different IDE?**
A: Yes, but VSCode extension provides significant benefits. CLI works with any editor.

**Q: Is this official FINOS certification?**
A: No formal certification, but completing the challenge demonstrates practical CALM expertise.

**Q: Can I share my solutions?**
A: Yes! Public sharing is encouraged to help and inspire others.

**Q: What if I get stuck?**
A: Use FINOS community resources, GitHub issues, or office hours for help.

## Files in This Directory

- `PLAN.md` - Detailed planning document with pedagogical rationale
- `SUMMARY.md` - Technical creation summary and verification notes
- `README.md` - This file, overview and quick start guide
- `day-1.md` through `day-24.md` - Daily challenge files

## Contributing

Found an issue or have a suggestion?
- [Raise an issue](https://github.com/finos/architecture-as-code/issues/new/choose)
- Submit a PR with improvements
- Share feedback in community meetings

## License

Copyright 2025 FINOS

Licensed under the Apache License, Version 2.0

## Acknowledgments

Inspired by:
- [Advent of Code](https://adventofcode.com/)
- Morgan Stanley's YETI Advent of Modern
- The FINOS Architecture as Code community

Created as part of the FINOS Architecture as Code project.

---

**Ready to begin? Start with [day-1.md](day-1.md)!** 🚀
