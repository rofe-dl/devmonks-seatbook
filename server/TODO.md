1. Distributed locking
2. Keeping seat map updated by polling or SSE
3. Check for all kinds of error handling and showing error messages
4. Improving search maybe? Low priority
5. Check if redirected to login page if token expires
6. Add proper loading skeletons?
7. Do an env validation check
8. Fix server url in FE
9. Add unique index to booking to prevent duplicates
10. Proper error handling to hide error messages
11. Rate limiting?
12. Add validation layer
13. Proper TypeScript types
14. Frontend design system
15. Pagination in events with server side search

Possible problems:
1. Unique index on booking for seatId + status
2. User reserves a seat, then reloads the page
