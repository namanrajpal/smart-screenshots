// src/components/Options/FolderStructureInput.js
import React from 'react';

const FolderStructureInput = ({ value, onChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="folderStructure">Folder Structure Template:</label>
      <input
        type="text"
        id="folderStructure"
        name="folderStructure"
        value={value}
        onChange={onChange}
        placeholder="Screenshots/[Type]/[Month]/[Name]"
      />
      <div className="help-text">
        Available placeholders: [Type], [Month], [Year], [Vendor], [Amount], [Name]
      </div>
    </div>
  );
};

export default FolderStructureInput;