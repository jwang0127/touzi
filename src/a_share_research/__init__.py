"""A-share research evidence and audit foundation."""

from .audit import AuditResult, audit_package
from .mock_adapter import MockAdapter

__all__ = ["AuditResult", "MockAdapter", "audit_package"]
