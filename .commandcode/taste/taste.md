# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# React Native Animation
See [react-native-animation/taste.md](react-native-animation/taste.md)

# Code Style
- Prefer pure functions over mutable objects for data mapping and transformations. Confidence: 0.80
- Keep React render pure; move side effects out of useMemo and into useEffect. Confidence: 0.75
- For runtime guards, prefer clamping (Math.max/Math.min) over crashing or console.error; fail gracefully with bounded values. Confidence: 0.70

# Algorithms
- Use binary search for finding the nearest value in sorted arrays instead of delta/tolerance-based approaches. Confidence: 0.75

# Workflow
- When React Doctor issues are raised, offer to set up React Doctor CI first before fixing issues. Confidence: 0.75
- After applying a fix, re-run the actual linting/analysis tool (e.g., npx react-doctor@latest --verbose) to verify the issue is resolved before moving on. Confidence: 0.75

# Code Style
- Fix the root cause of linting/analysis issues rather than suppressing or silencing the rule. Confidence: 0.70

# Communication
- When fixing issues, explain each one in plain language as you go: what the problem is, why it matters, and the real-world impact/concrete severity. Confidence: 0.70
