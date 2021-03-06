from datetime import datetime
from sys import intern
from typing import Tuple, Union, Optional, List


class PageContent:
    def __init__(self, domain: str, title: str, revid: int, content: str, content_ts: str,
                 protection: Optional[List[str]]):
        self.domain = domain
        self.title = title
        self.revid = revid
        self.content = intern(content)
        self.content_ts = content_ts
        self.protection = protection

    def __str__(self):
        return f'{self.domain}/wiki/{self.title}'


TitlePagePair = Tuple[str, Union[PageContent, None]]
