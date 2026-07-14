package org.finos.calm.store;

import org.finos.calm.domain.*;
import org.finos.calm.domain.namespaces.NamespaceResourceSummary;
import org.finos.calm.domain.exception.ArchitectureNotFoundException;
import org.finos.calm.domain.exception.ArchitectureVersionExistsException;
import org.finos.calm.domain.exception.ArchitectureVersionNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;

import java.util.List;

public interface ArchitectureStore {
    /**
     * Retrieve all architecture summaries for a namespace (unpaged).
     *
     * @param namespace the namespace to retrieve architectures for
     * @return the full list of architecture summaries
     */
    default List<NamespaceResourceSummary> getArchitecturesForNamespace(String namespace) throws NamespaceNotFoundException {
        return getArchitecturesForNamespace(namespace, PageRequest.UNPAGED);
    }

    /**
     * Retrieve architecture summaries for a namespace, optionally paged.
     *
     * @param namespace the namespace to retrieve architectures for
     * @param page      the optional {@code limit}/{@code offset} paging window
     *                  ({@link PageRequest#UNPAGED} for the full list)
     * @return a (possibly paged) list of architecture summaries
     */
    List<NamespaceResourceSummary> getArchitecturesForNamespace(String namespace, PageRequest page) throws NamespaceNotFoundException;
    Architecture createArchitectureForNamespace(Architecture architecture) throws NamespaceNotFoundException;
    List<String> getArchitectureVersions(Architecture architecture) throws NamespaceNotFoundException, ArchitectureNotFoundException;
    String getArchitectureForVersion(Architecture architecture) throws NamespaceNotFoundException, ArchitectureNotFoundException, ArchitectureVersionNotFoundException;
    Architecture createArchitectureForVersion(Architecture architecture) throws NamespaceNotFoundException, ArchitectureNotFoundException, ArchitectureVersionExistsException;
    Architecture updateArchitectureForVersion(Architecture architecture) throws NamespaceNotFoundException, ArchitectureNotFoundException;

    /**
     * Store a rendered PNG thumbnail for the architecture version identified by
     * {@code architecture} (namespace, id, version). Stored base64-encoded alongside —
     * never inside — the version's document value, so the document itself is untouched.
     *
     * @param architecture the architecture version the thumbnail belongs to
     * @param png          the PNG bytes to store
     */
    void storeThumbnail(Architecture architecture, byte[] png) throws NamespaceNotFoundException, ArchitectureNotFoundException, ArchitectureVersionNotFoundException;

    /**
     * Retrieve the stored thumbnail for the architecture version identified by
     * {@code architecture} (namespace, id, version).
     *
     * @param architecture the architecture version to fetch the thumbnail for
     * @return the PNG bytes, or {@code null} when no thumbnail is stored for the version
     */
    byte[] getThumbnail(Architecture architecture) throws NamespaceNotFoundException, ArchitectureNotFoundException, ArchitectureVersionNotFoundException;
}
