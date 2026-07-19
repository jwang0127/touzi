# External skill policy

Before enabling a third-party skill, read every loaded file, statically inspect shell/network/filesystem/secret/subprocess behavior, list external domains and data destinations, and test in isolation.

Do not allow `curl | bash`, automatic elevation, public tunnels, security-scan bypass, credential uploads, or external rules that override this audit. Treat social posts as leads only.
