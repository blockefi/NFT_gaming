//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/upgradeability/CustomOwnable.sol";
import "contracts/MinterRole.sol";

/**
 * @title ERC721 Non-Fungible Token Standard basic implementation
 * @dev see https://eips.ethereum.org/EIPS/eip-721
 */
contract Cards is CustomOwnable, ReentrancyGuard, ERC165, IERC721, IERC721Metadata, MinterRole {
    using SafeMath for uint256;
    using Address for address;
    using Strings for uint256;

    // Token name
    string internal _name;

    // Token symbol
    string internal _symbol;

     // Base URI
    string internal _baseURI;

    bool internal _initialized;

    // Optional mapping for token URIs
    mapping (uint256 => string) internal _tokenURIs;

     // Mapping from token ID to approved address
    mapping (uint256 => address) internal _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping (address => mapping (address => bool)) internal _operatorApprovals;

    // Mapping owner address to token count
    mapping(address => uint) internal _balances;

    // Mapping from token ID to owner address
    mapping (uint256 => address) internal _owners;

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     * @param owner is set as the owner for the Cards contract
     */
    function initialize(address owner, string memory name_, string memory symbol_) public {
        require(!_initialized, "Cards: Already Initialized");
        _initialized = true;
        _setOwner(owner);
        _addMinter(owner);
        _name = name_;
        _symbol = symbol_;
    }

     /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC721).interfaceId
            || interfaceId == type(IERC721Metadata).interfaceId
            || super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "Cards: balance query for the zero address");
        return _balances[owner];
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        require(_exists(tokenId), "Cards: Invalid TokenId");

        return _owners[tokenId];
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = this.ownerOf(tokenId);
        require(to != owner, "Cards: approval to current owner");

        require(_msgSender() == owner || this.isApprovedForAll(owner, _msgSender()),
            "Cards: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        require(_exists(tokenId), "Cards: approved query for nonexistent token");

        return _tokenApprovals[tokenId];
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        require(operator != _msgSender(), "Cards: approve to caller");
        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev Check if the token is already minted or not
     */
    function exists(uint256 tokenId) public view virtual returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev mints next tokenId at 'to' address
     */
    function mint(uint256 cardId, string memory _tokenURI) public virtual onlyMinter nonReentrant {
        _safeMint(owner(), cardId);
        _setTokenURI(cardId, _tokenURI);
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Cards: transfer caller is not owner nor approved");

        _transfer(from, to, tokenId);
    }

    /**
     * @dev Mints token bundle to one or multiple users
     * @dev !!!Important this function can only be called by the one who has the
     * @dev both the arrays must have the same length
     * @param cardIds - array of card ids to be minted
     * @param _tokenURI - array of uri for all cards to be minted
     */
    function bundleMint(uint[] memory cardIds, string[] memory _tokenURI) public onlyMinter nonReentrant {
        require(cardIds.length > 1, "Cards: Invalid bundle size");
        require(_tokenURI.length == cardIds.length, "Cards: TokenURIs and Cards amount won't match");

        _batchMint(owner(), cardIds, _tokenURI);
    }

    /**
     * @dev batchTransferFrom() - For transfering set of tokens from one user to another user wallet
     * @param from set as address of token of owner.
     * @param cardIds set as id of particular token.
     * @param to set as address of receiver.
     */
    function batchTransferFrom(address from, address to, uint[] memory cardIds) public virtual nonReentrant {
        require(from == _msgSender() || this.isApprovedForAll(from,_msgSender()), "Cards: transfer caller is not owner nor approved");
        _batchTransferFrom(from, to, cardIds);
    }

    /**
     * @dev bundleTransfer() - For transfering set of tokens from multiple owner's address to multiple buyer's address.
     * @dev !!!Important this function can only be called by the one of the admins'
     * @param cardIds set as cards to be exchanged.
     * @param to set as address of receiver.
     */
    function bundleTransfer(address[] memory to, uint256[] memory cardIds)
        public
        onlyMinter
        nonReentrant
    {
        uint256 len = cardIds.length;

        require(len > 0, "Cards: Invalid batch-size");
        require(to.length == cardIds.length, "Cards: Batch-size mismatch");

        for (uint256 i; i < len; i++) {
            safeTransferFrom(owner(), to[i], cardIds[i]);
        }
    }

    /**
     * @dev Mints token bundle to one or multiple users
     * @dev !!!Important this function can only be called by the one of the admins'
     * @dev both the arrays must have the same length
     * @param cardIds - array of card ids to be minted
     */
    function bundleBurn(uint256[] memory cardIds)
        public
        onlyMinter
        nonReentrant
    {
        require(cardIds.length > 0, "Cards: Invalid bundle size");

        _bundleBurn(_msgSender(), cardIds);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Cards: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, _data);
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Cards: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev set URI for for a particular card/tokenId
     * @dev !!!Important this function can only be called by the one of the admins'
     * @param tokenId - for which the uri has to be set
     * @param uri - should be a non-zero length string
     */
    function setTokenURI(uint tokenId, string memory uri) public virtual onlyMinter returns(bool) {
        require(bytes(uri).length > 0, "Cards: Invalid URI");

        _setTokenURI(tokenId, uri);
        return true;
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `_data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * Cards internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory _data) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "Cards: transfer to non ERC721Receiver implementer");
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    /**
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        require(_exists(tokenId), "Cards: operator query for nonexistent token");
        address owner = this.ownerOf(tokenId);
        return (owner == spender || getApproved(tokenId) == spender || this.isApprovedForAll(owner, spender));
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    /**
     * @dev Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, _data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "Cards: mint to the zero address");
        require(!_exists(tokenId), "Cards: token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = this.ownerOf(tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, Cards imposes no restrictions on _msgsender().
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(address from, address to, uint256 tokenId) internal virtual {
        require(this.ownerOf(tokenId) == from, "Cards: transfer of token that is not own");
        require(to != address(0), "Cards: transfer to the zero address");

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev For transfering set of tokens from one user to another user wallet
     * @param from set as address of token of owner.
     * @param ids set as id of particular token.
     * @param to set as address of receiver.
     */
    function _batchTransferFrom(address from, address to, uint256[] memory ids) internal virtual {
        uint256 len = ids.length;
        require(to != address(0), "Cards: Invalid receiver address");
        require(len > 1, "Cards: Invalid batch-size");

        for (uint256 i; i < len; i++) {
            uint256 tokenId = ids[i];

            require(this.ownerOf(tokenId) == from, "Cards: Invalid Owner");
            require(_checkOnERC721Received(from, to, tokenId, ""), "Cards: transfer to non ERC721Receiver implementer");

            // Clear approvals from the previous owner
            _approve(address(0), tokenId);
            _owners[tokenId] = to;

            emit Transfer(from, to, tokenId);
        }

        _balances[from] -= len;
        _balances[to] += len;
    }

    /**
     * @dev Mints token bundle to one or multiple users
     * @dev !!!Important this function can only be called by the one who has the
     * @dev both the arrays must have the same length
     * @param to - address to which the tokens are minted
     * @param cardIds - array of card ids to be minted
     * @param _tokenURI - array of uri for all cards to be minted
     */
    function _batchMint(address to, uint256[] memory cardIds, string[] memory _tokenURI) internal virtual {
        require(to != address(0), "Cards: must not be null");
        require(to == owner(), "Cards: Only owner can receive");

        uint256 len = cardIds.length;

        for (uint256 i = 0; i < len; i++) {
            uint256 tokenId = cardIds[i];

            require(bytes(_tokenURI[i]).length > 0, "Cards: Invalid URI");
            require(!_exists(tokenId), "Cards: TokenId already owned");
            require(_checkOnERC721Received(address(0), to, tokenId, ""),
                    "ERC721: transfer to non ERC721Receiver implementer");

            _owners[tokenId] = to;
            _setTokenURI(tokenId, _tokenURI[i]);

            emit Transfer(address(0), to, tokenId);
        }

        _balances[to] = _balances[to].add(len);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _bundleBurn(address tokenOwner, uint256[] memory tokenId)
        internal
        virtual
    {
        uint256 len = tokenId.length;

        for (uint256 i; i < len; i++) {
            require(
                ownerOf(tokenId[i]) == tokenOwner,
                "Cards: Only token owner can burn"
            );
            // Clear approvals
            _approve(address(0), tokenId[i]);
            delete _owners[tokenId[i]];

            emit Transfer(tokenOwner, address(0), tokenId[i]);
        }

        _balances[tokenOwner] -= len;
    }

    /**
     * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "Cards: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Internal function to set the base URI for all token IDs. It is
     * automatically added as a prefix to the value returned in {tokenURI},
     * or to the token ID if {tokenURI} is empty.
     */
    function _setBaseURI(string memory baseURI_) internal virtual {
        _baseURI = baseURI_;
    }

      /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data)
        private returns (bool)
    {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver(to).onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Cards: transfer to non ERC721Receiver implementer");
                } else {
                    // solhint-disable-next-line no-inline-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _approve(address to, uint256 tokenId) private {
        _tokenApprovals[tokenId] = to;
        emit Approval(this.ownerOf(tokenId), to, tokenId); // internal owner
    }
}