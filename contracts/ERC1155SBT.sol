// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract TokenERC1155SBT is AccessControl, ERC1155Supply {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public baseMetadataURI;
    mapping(bytes32 => bool) public roots;
    mapping(bytes32 => mapping(address => bool)) public claimed;
    string public name;
    string public symbol;

    event SetRoot(bytes32 indexed root, bool valid);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseMetadataURI
    ) ERC1155(_baseMetadataURI) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        baseMetadataURI = _baseMetadataURI;
        name = _name;
        symbol = _symbol;
    }

    modifier onlyMinter() {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "ERC1155: must have minter role to mint"
        );
        _;
    }

    function mint(address to, uint256 id, uint256 amount) public onlyMinter {
        _mint(to, id, amount, new bytes(0));
    }

    function mint(
        bytes32[] calldata proof,
        bytes32 root,
        uint256 tokenId,
        uint256 amount
    ) public {
        require(roots[root], "invalid root!");
        require(!claimed[root][msg.sender], "aleardy claimed!");
        claimed[root][msg.sender] = true;
        require(
            MerkleProof.verify(
                proof,
                root,
                keccak256(abi.encode(tokenId, amount, msg.sender))
            ),
            "invalid merkle proof"
        );
        _mint(msg.sender, tokenId, amount, new bytes(0));
    }

    function setRoot(bytes32 root) public {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "ERC1155: must have minter role to mint"
        );
        roots[root] = !roots[root];
        emit SetRoot(root, roots[root]);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyMinter {
        _mintBatch(to, ids, amounts, data);
    }

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public onlyMinter {
        _burn(account, id, value);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public onlyMinter {
        _burnBatch(account, ids, values);
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override {
        revert("SBT!");
    }

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override onlyMinter {
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override onlyMinter {
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl, ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setURI(string memory uri_) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "ERC1155: must have Admin role to mint"
        );
        baseMetadataURI = uri_;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(totalSupply(tokenId) > 0, "ERC1155: NONEXISTENT_TOKEN");
        return
            string(
                abi.encodePacked(baseMetadataURI, Strings.toString(tokenId))
            );
    }
}
