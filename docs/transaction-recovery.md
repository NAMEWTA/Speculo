# Installation transactions and recovery

Only the CLI installation is transactional. This journal does not execute models or own workflow business state.

The active root is .agents/speculo/. The exclusive installation lock is .agents/.speculo-install.lock/, and staging/backup trees live under .agents/.speculo-transactions/. Journal schema 3 records the installation identity, before/after tree fingerprints, external file images, and individual owned Skill projection files for both hosts.

Tree fingerprints include directory existence, file bytes, node type and link text. POSIX includes permission bits; Windows does not claim ACL/ownership equivalence. Recovery requires the original snapshot platform. File checks and rename boundaries assume cooperating writers, not a hostile filesystem.

Run speculo doctor <project> first. Preserve the reported transaction ID, owner, journal, staging and backup. Then use speculo recover <project> --transaction <exact-id> only after the owning process has stopped on the original host. Unknown schema, foreign host/platform, a live owner, escaped/symlink paths or drift block recovery and preserve evidence. Never remove a lock to bypass the checks.

Before rollback, the CLI validates all affected trees and external images. It restores only images matching the recorded before/after values. Committed transactions only finish verified cleanup. Edited or third-party Skill files and additional user files remain untouched; removal cleans only proven empty managed directories.

Old installations and journals are not converted. Preserve them and use their owning version plus independently verified backups to determine a separate recovery procedure. Do not relabel journals or fabricate hashes. Refresh of a current installation preserves opaque runtime data, unowned static files and existing source identity; incompatible structured data stops replacement.
